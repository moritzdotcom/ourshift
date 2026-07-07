import prisma from '@/lib/prismadb';

const APP_TIME_ZONE = 'Europe/Berlin';

type ShiftLike = {
  start: Date;
  end: Date;
  clockIn: Date | null;
  clockOut: Date | null;
  shiftAbsence: { reason: 'SICKNESS' } | null;
};

type PlannedShiftLike = {
  start: Date;
  end: Date;
};

type VacationDayLike = {
  date: Date;
};

type ContractLike = {
  weeklyHours: unknown;
  vacationDaysAnnual: number | null;
  validFrom: Date;
  validUntil: Date | null;
};

function toNumber(value: unknown) {
  if (value == null) return 0;
  return Number(value);
}

/**
 * Wandelt einen UTC-Zeitpunkt in Kalenderbestandteile der App-Zeitzone um.
 * Wichtig, weil Vertragsgrenzen wie 2026-01-31T23:59:59.999Z in Deutschland
 * fachlich bereits der 01.02.2026 sind.
 */
function dateTimePartsInTimeZone(date: Date, timeZone = APP_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));

  return {
    year: Number(map.year),
    month0: Number(map.month) - 1,
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function dayKey(date: Date) {
  const { year, month0, day } = dateTimePartsInTimeZone(date);

  return `${year}-${String(month0 + 1).padStart(2, '0')}-${String(day).padStart(
    2,
    '0',
  )}`;
}

function getTimeZoneOffsetMs(date: Date, timeZone = APP_TIME_ZONE) {
  const parts = dateTimePartsInTimeZone(date, timeZone);

  const asUtc = Date.UTC(
    parts.year,
    parts.month0,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  // Millisekunden bewusst entfernen, weil Intl keine ms liefert.
  const dateWithoutMs = date.getTime() - date.getMilliseconds();

  return asUtc - dateWithoutMs;
}

/**
 * Erstellt aus einem lokalen Datum/Uhrzeit in Europe/Berlin den passenden UTC-Date.
 * Ohne externe Library, aber DST-sicher genug für unsere Monatsgrenzen.
 */
function zonedDateTimeToUtc(
  year: number,
  month0: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  ms = 0,
) {
  const localAsUtcMs = Date.UTC(year, month0, day, hour, minute, second, ms);

  let utcDate = new Date(localAsUtcMs);

  for (let i = 0; i < 3; i++) {
    const offset = getTimeZoneOffsetMs(utcDate);
    const nextUtcDate = new Date(localAsUtcMs - offset);

    if (nextUtcDate.getTime() === utcDate.getTime()) {
      return nextUtcDate;
    }

    utcDate = nextUtcDate;
  }

  return utcDate;
}

function startOfMonthInTimeZone(year: number, month0: number) {
  return zonedDateTimeToUtc(year, month0, 1, 0, 0, 0, 0);
}

function endOfMonthInTimeZone(year: number, month0: number) {
  const startOfNextMonth = zonedDateTimeToUtc(year, month0 + 1, 1, 0, 0, 0, 0);

  return new Date(startOfNextMonth.getTime() - 1);
}

function monthRangeInTimeZone(year: number, month0: number) {
  return {
    start: startOfMonthInTimeZone(year, month0),
    end: endOfMonthInTimeZone(year, month0),
  };
}

function startOfYearInTimeZone(year: number) {
  return zonedDateTimeToUtc(year, 0, 1, 0, 0, 0, 0);
}

function endOfYearInTimeZone(year: number) {
  const startOfNextYear = zonedDateTimeToUtc(year + 1, 0, 1, 0, 0, 0, 0);
  return new Date(startOfNextYear.getTime() - 1);
}

function shiftsForMonth<S extends PlannedShiftLike>(
  shifts: S[],
  year: number,
  month0: number,
) {
  const { start: bom, end: eom } = monthRangeInTimeZone(year, month0);

  return shifts.filter((s) => s.end >= bom && s.start <= eom);
}

function vacationDaysForMonth<VD extends VacationDayLike>(
  vacationDays: VD[],
  year: number,
  month0: number,
) {
  const { start: bom, end: eom } = monthRangeInTimeZone(year, month0);

  return vacationDays.filter((d) => d.date >= bom && d.date <= eom);
}

function trailingVacationDaysAtMonthEnd<VD extends VacationDayLike>(
  days: VD[],
  year: number,
  month0: number,
): VD[] {
  const vacationDays = vacationDaysForMonth(days, year, month0);
  const lastDay = new Date(year, month0 + 1, 0).getDate();

  const byDay = new Map<number, VD>();

  for (const vd of vacationDays) {
    const { day } = dateTimePartsInTimeZone(vd.date);
    byDay.set(day, vd);
  }

  if (!byDay.has(lastDay)) return [];

  let k = 1;

  while (byDay.has(lastDay - k)) {
    k++;
  }

  // Wenn bereits mehr als 4 Tage im Vormonat liegen, wurde diese Woche dort
  // schon als volle Urlaubswoche gezählt.
  if (k > 4) return [];

  const start = lastDay - k + 1;

  return Array.from({ length: k }, (_, i) => byDay.get(start + i)!);
}

function minutesInRange(a: Date, b: Date) {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
}

function clampIntervalToMonth(
  start: Date,
  end: Date,
  year: number,
  month0: number,
) {
  const { start: bom, end: eom } = monthRangeInTimeZone(year, month0);

  const s = start < bom ? bom : start;
  const e = end > eom ? eom : end;

  if (e <= s) return null;

  return { s, e };
}

function shiftMinutesForMonth(s: ShiftLike, year: number, month0: number) {
  // Bei Krankheit zählt der geplante Dienst, nicht die Stempelzeit.
  if (s.shiftAbsence) {
    const clamped = clampIntervalToMonth(s.start, s.end, year, month0);
    if (!clamped) return 0;

    return minutesInRange(clamped.s, clamped.e);
  }

  // Ohne Stempel & ohne Absence: 0
  if (!s.clockIn || !s.clockOut) return 0;

  const clamped = clampIntervalToMonth(s.clockIn, s.clockOut, year, month0);
  if (!clamped) return 0;

  return minutesInRange(clamped.s, clamped.e);
}

function plannedShiftMinutesForMonth(
  s: PlannedShiftLike,
  year: number,
  month0: number,
) {
  const clamped = clampIntervalToMonth(s.start, s.end, year, month0);
  if (!clamped) return 0;

  return minutesInRange(clamped.s, clamped.e);
}

function contractOverlapsMonth<C extends ContractLike>(
  contract: C,
  year: number,
  month0: number,
) {
  const { start: bom, end: eom } = monthRangeInTimeZone(year, month0);

  return (
    contract.validFrom <= eom &&
    (!contract.validUntil || contract.validUntil >= bom)
  );
}

/**
 * Für die Zeitkonto-Berechnung gilt:
 * Pro User und Monat darf genau ein Vertrag zählen.
 *
 * Wenn es durch unsaubere Daten trotzdem Überschneidungen gibt,
 * gewinnt der Vertrag mit dem neuesten validFrom.
 */
function getContractForMonth<C extends ContractLike>(
  contracts: C[],
  year: number,
  month0: number,
): C | null {
  return (
    contracts
      .filter((c) => contractOverlapsMonth(c, year, month0))
      .sort((a, b) => b.validFrom.getTime() - a.validFrom.getTime())[0] ?? null
  );
}

export type WorkingStatsEntry = {
  user: { id: string; firstName: string; lastName: string };
  mHours: number; // Ist Stunden Monat
  mHoursPlan: number; // Soll Stunden Monat
  mHoursPlanned: number; // Plan Stunden Monat
  yHours: number; // Ist Stunden Jahr bis inkl. ausgewähltem Monat
  yHoursPlan: number; // Soll Stunden Jahr bis inkl. ausgewähltem Monat
  yHoursPlanned: number; // Plan Stunden Jahr bis inkl. ausgewähltem Monat
  overtime: number; // Überstunden Ist
  overtimePlanned: number; // Überstunden geplant
  overtimePrevYear: number; // Restüberstunden Vorjahr
  mVacation: number; // Urlaubstage Monat
  yVacation: number; // Urlaubstage Jahr bis inkl. ausgewähltem Monat
  yVacationPlan: number; // Urlaubstage Soll Gesamtjahr
  rVacationPrevYear: number; // Resturlaub Vorjahr
  mSickDays: number; // Kranktage Monat
  ySickDays: number; // Kranktage Jahr bis inkl. ausgewähltem Monat
};

export async function calculateWorkingStats(
  year: number,
  month: number,
): Promise<WorkingStatsEntry[]> {
  if (!Number.isInteger(year)) {
    throw new Error('Invalid year.');
  }

  // month ist 0-basiert: Januar = 0, Februar = 1, ...
  if (!Number.isInteger(month) || month < 0 || month > 11) {
    throw new Error('Invalid month. Expected 0-11.');
  }

  const boy = startOfYearInTimeZone(year);
  const eoy = endOfYearInTimeZone(year);
  const eotf = endOfMonthInTimeZone(year, month);
  const now = new Date();

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      employmentStart: { lte: eotf },
      OR: [{ terminationDate: null }, { terminationDate: { gte: boy } }],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      shifts: {
        where: {
          start: { lte: eotf },
          end: { gte: boy },
        },
        select: {
          clockIn: true,
          clockOut: true,
          start: true,
          end: true,
          shiftAbsence: {
            where: { status: 'APPROVED' },
            select: { reason: true },
          },
        },
      },
      manualAdjustments: {
        where: {
          year: year - 1,
        },
      },
      contracts: {
        where: {
          validFrom: { lte: eoy },
          OR: [{ validUntil: null }, { validUntil: { gte: boy } }],
        },
        select: {
          weeklyHours: true,
          vacationDaysAnnual: true,
          validFrom: true,
          validUntil: true,
        },
      },
      vacationDays: {
        select: {
          date: true,
        },
      },
    },
  });

  const statsDezLastYear = await prisma.kpiCache.findUnique({
    where: {
      type_year_monthIndex: {
        type: 'TIMEACCOUNT',
        year: year - 1,
        monthIndex: 11,
      },
    },
  });

  const getRestVacation = (userId: string) => {
    if (!statsDezLastYear) return 0;

    const userStats = (statsDezLastYear.payload as WorkingStatsEntry[]).find(
      (e) => e.user.id === userId,
    );

    if (!userStats) return 0;

    return userStats.yVacationPlan - userStats.yVacation;
  };

  const getRestOvertime = (userId: string) => {
    if (!statsDezLastYear) return 0;

    const userStats = (statsDezLastYear.payload as WorkingStatsEntry[]).find(
      (e) => e.user.id === userId,
    );

    if (!userStats) return 0;

    const manualAdjustment = users.find((u) => u.id === userId)
      ?.manualAdjustments[0];

    return (
      userStats.overtime + (manualAdjustment?.hoursAdjustment.toNumber() || 0)
    );
  };

  const list: WorkingStatsEntry[] = [];

  for (const u of users) {
    const entry: WorkingStatsEntry = {
      user: {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
      },
      mHours: 0,
      mHoursPlan: 0,
      mHoursPlanned: 0,
      yHours: 0,
      yHoursPlan: 0,
      yHoursPlanned: 0,
      overtime: 0,
      overtimePlanned: 0,
      overtimePrevYear: getRestOvertime(u.id),
      mVacation: 0,
      yVacation: 0,
      yVacationPlan: 0,
      rVacationPrevYear: getRestVacation(u.id),
      mSickDays: 0,
      ySickDays: 0,
    };

    const sickDaySet = new Set<string>();

    /**
     * Urlaubssoll ist ein Jahreswert.
     * Daher hier bewusst Januar bis Dezember durchgehen.
     * Pro Monat zählt genau ein Vertrag.
     */
    for (let m = 0; m < 12; m++) {
      const contract = getContractForMonth(u.contracts, year, m);

      if (!contract) continue;

      entry.yVacationPlan += toNumber(contract.vacationDaysAnnual) / 12;
    }

    /**
     * Stunden, Ist-Urlaub und Krankheit nur bis inkl. ausgewähltem Monat.
     * Wichtig: Nicht pro Vertrag iterieren, sonst werden Schichten/Urlaub/Krankheit
     * bei mehreren Verträgen doppelt gezählt.
     */
    for (let m = 0; m <= month; m++) {
      const contract = getContractForMonth(u.contracts, year, m);

      if (!contract) continue;

      const monthlyHoursPlan = toNumber(contract.weeklyHours) * (52 / 12);

      const { end: endOfMonth } = monthRangeInTimeZone(year, m);
      const isFutureMonth = now <= endOfMonth;

      const shifts = shiftsForMonth(u.shifts, year, m);
      const vacationDays = vacationDaysForMonth(u.vacationDays, year, m).length;

      let monthActualHours = 0;
      let monthPlannedHours = 0;

      const sickDaySetM = new Set<string>();

      for (const s of shifts) {
        const actualHours = shiftMinutesForMonth(s, year, m) / 60;
        const plannedHours = plannedShiftMinutesForMonth(s, year, m) / 60;

        monthActualHours += actualHours;
        monthPlannedHours += plannedHours;

        if (s.shiftAbsence) {
          sickDaySet.add(dayKey(s.start));
          sickDaySetM.add(dayKey(s.start));
        }
      }

      /**
       * Urlaub als Stunden:
       * 5 Urlaubstage = 1 volle Urlaubswoche = weeklyHours.
       *
       * Sonderfall Monatswechsel:
       * Wenn die Urlaubswoche z. B. 29.01.-02.02. läuft,
       * dann wird sie erst im Februar als volle Woche erkannt.
       */
      const prevMonthVacationDays = trailingVacationDaysAtMonthEnd(
        u.vacationDays,
        year,
        m - 1,
      ).length;

      const fullVacationWeeks = Math.floor(
        (vacationDays + prevMonthVacationDays) / 5,
      );

      const vacationHours = fullVacationWeeks * toNumber(contract.weeklyHours);

      monthActualHours += vacationHours;
      monthPlannedHours += vacationHours;

      entry.yVacation += vacationDays;
      entry.yHoursPlan += monthlyHoursPlan;
      entry.yHours += monthActualHours;
      entry.yHoursPlanned += isFutureMonth
        ? monthPlannedHours
        : monthActualHours;

      if (m === month) {
        entry.mHours = monthActualHours;
        entry.mHoursPlan = monthlyHoursPlan;
        entry.mHoursPlanned = monthPlannedHours;
        entry.mVacation = vacationDays;
        entry.mSickDays = sickDaySetM.size;
      }
    }

    entry.ySickDays = sickDaySet.size;
    entry.overtime = entry.yHours - entry.yHoursPlan;
    entry.overtimePlanned = entry.yHoursPlanned - entry.yHoursPlan;

    list.push(entry);
  }

  return list;
}
