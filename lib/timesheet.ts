import { pickContractForDate } from './digitalContract';
import prisma from '@/lib/prismadb';
import { ruleActiveOnDay } from './payRule';
import { fromZonedTime, toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { addDays } from 'date-fns';
import { Decimal } from '@prisma/client/runtime/library';

export type TimeSheetShift = {
  start: string; // ISO (UTC)
  end: string; // ISO (UTC)
  hours: number; // decimal hours
  code: 'SICK' | 'VACATION' | null;
};

export type TimeSheetDay = {
  day: number; // 1..31
  shifts: TimeSheetShift[];
  supplements: number; // euros, 2 decimals
};

const TZ = 'Europe/Berlin';

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function centsToEuros2(cents: number) {
  return round2(cents / 100);
}

function decimalToNumber(d: any): number {
  if (d == null) return 0;
  if (typeof d === 'number') return d;
  if (typeof d === 'string') return Number(d);
  if (typeof d === 'object' && typeof d.toNumber === 'function')
    return d.toNumber();
  return Number(d);
}

// --- TZ helpers (Berlin) ---
function berlinStartOfDayUtc(dateUtc: Date) {
  const z = toZonedTime(dateUtc, TZ);
  z.setHours(0, 0, 0, 0);
  return fromZonedTime(z, TZ);
}

function berlinAddDaysUtc(dateUtc: Date, days: number) {
  const z = toZonedTime(dateUtc, TZ);
  z.setDate(z.getDate() + days);
  return fromZonedTime(z, TZ);
}

function berlinIsoDayKey(dateUtc: Date) {
  return formatInTimeZone(dateUtc, TZ, 'yyyy-MM-dd');
}

function berlinDayNumber(dateUtc: Date) {
  return Number(formatInTimeZone(dateUtc, TZ, 'd')); // 1..31
}

function berlinEndOfDayUtc(dayStartUtc: Date) {
  const z = toZonedTime(dayStartUtc, TZ);
  z.setHours(23, 59, 59, 999);
  return fromZonedTime(z, TZ);
}

function minutesToDate(dayStartUtc: Date, minutes: number) {
  return new Date(dayStartUtc.getTime() + minutes * 60_000);
}

function clamp(a: Date, lo: Date, hi: Date) {
  return new Date(Math.min(hi.getTime(), Math.max(lo.getTime(), a.getTime())));
}

function overlapMinutes(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  const s = Math.max(aStart.getTime(), bStart.getTime());
  const e = Math.min(aEnd.getTime(), bEnd.getTime());
  return Math.max(0, (e - s) / 60_000);
}

type PayRuleLite = {
  windowStartMin: number | null;
  windowEndMin: number | null;
  daysOfWeek: number[];
  holidayOnly: boolean;
  excludeHolidays: boolean;
  validFrom: Date;
  validUntil: Date | null;
  percent: any; // Decimal
};

function ruleIntervalsForDay(
  rule: PayRuleLite,
  dayStartUtc: Date
): Array<[Date, Date]> {
  const ds = dayStartUtc;
  const de = berlinEndOfDayUtc(dayStartUtc);

  if (rule.windowStartMin == null || rule.windowEndMin == null) {
    return [[ds, de]];
  }

  const sMin = rule.windowStartMin;
  const eMin = rule.windowEndMin;

  if (eMin >= sMin) {
    return [[minutesToDate(ds, sMin), minutesToDate(ds, eMin)]];
  }

  // over midnight
  return [
    [ds, minutesToDate(ds, eMin)],
    [minutesToDate(ds, sMin), de],
  ];
}

function findHourlyRateCentsForDate(
  contracts: Array<{
    validFrom: Date;
    validUntil: Date | null;
    hourlyRateCents: number | null;
  }>,
  dayStartUtc: Date
) {
  const t = dayStartUtc.getTime();
  const active = contracts
    .filter(
      (c) =>
        c.validFrom.getTime() <= t &&
        (!c.validUntil || c.validUntil.getTime() >= t)
    )
    .sort((a, b) => b.validFrom.getTime() - a.validFrom.getTime())[0];

  return active?.hourlyRateCents ?? 0;
}

function findWeeklyHoursForDate(
  contracts: Array<{
    validFrom: Date;
    validUntil: Date | null;
    weeklyHours: Decimal | null;
  }>,
  dayStartUtc: Date
) {
  const t = dayStartUtc.getTime();
  const active = contracts
    .filter(
      (c) =>
        c.validFrom.getTime() <= t &&
        (!c.validUntil || c.validUntil.getTime() >= t)
    )
    .sort((a, b) => b.validFrom.getTime() - a.validFrom.getTime())[0];

  return active?.weeklyHours ? Number(active?.weeklyHours) : 0;
}

/**
 * year: z.B. 2025
 * monthIndex: 0..11
 */
export async function getUserTimesheet(
  userId: string,
  year: number,
  monthIndex: number
) {
  if (!Number.isInteger(year) || year < 1970 || year > 2100)
    throw new Error('Invalid year');
  if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11)
    throw new Error('Invalid month');

  // Monatsrange in Berlin:
  // start = 1. des Monats 00:00 Berlin (als UTC)
  // endExclusive = 1. des Folgemonats 00:00 Berlin (als UTC)
  const monthStartUtc = fromZonedTime(
    new Date(year, monthIndex, 1, 0, 0, 0, 0),
    TZ
  );
  const nextMonthStartUtc = fromZonedTime(
    new Date(year, monthIndex + 1, 1, 0, 0, 0, 0),
    TZ
  );

  // Anzahl Tage im Monat (kalenderlogisch)
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const [user, holidays] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        contracts: {
          select: {
            validFrom: true,
            validUntil: true,
            hourlyRateCents: true,
            weeklyHours: true,
          },
          orderBy: { validFrom: 'asc' },
        },
        payRules: {
          select: {
            windowStartMin: true,
            windowEndMin: true,
            daysOfWeek: true,
            holidayOnly: true,
            excludeHolidays: true,
            validFrom: true,
            validUntil: true,
            percent: true,
          },
        },
      },
    }),
    prisma.holiday.findMany({
      where: {
        date: {
          gte: monthStartUtc,
          lt: nextMonthStartUtc,
        },
      },
      select: { date: true },
    }),
  ]);

  if (!user) throw new Error('User not found');

  // Shifts, die den Monat schneiden (DST-safe, weil UTC-Range)
  const shifts = await prisma.shift.findMany({
    where: {
      userId,
      start: { lt: nextMonthStartUtc },
      end: { gt: monthStartUtc },
      OR: [
        { clockOut: { not: null } },
        { shiftAbsence: { status: 'APPROVED' } },
      ],
    },
    select: {
      id: true,
      start: true,
      end: true,
      clockIn: true,
      clockOut: true,
      shiftAbsence: { select: { reason: true } },
    },
    orderBy: { start: 'asc' },
  });

  const vacationDays = await prisma.vacationDay.findMany({
    where: { userId, date: { lte: nextMonthStartUtc, gte: monthStartUtc } },
  });

  // Output Tage initialisieren: 1..daysInMonth (kein Vormonat!)
  const days: Record<
    string,
    {
      day: number;
      shifts: TimeSheetShift[];
      supplementsCents: number;
      dayStartUtc: Date;
    }
  > = {};

  // wir iterieren kalendarisch in Berlin
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStartUtc = fromZonedTime(
      new Date(year, monthIndex, d, 0, 0, 0, 0),
      TZ
    );
    const key = berlinIsoDayKey(dayStartUtc);
    days[key] = { day: d, shifts: [], supplementsCents: 0, dayStartUtc };
  }

  const payRules: PayRuleLite[] = user.payRules;

  function calcSupplementsCentsForSegment(
    dayStartUtc: Date,
    segStart: Date,
    segEnd: Date
  ) {
    const dayKey = berlinIsoDayKey(dayStartUtc);
    const hourlyRateCents = findHourlyRateCentsForDate(
      user!.contracts,
      dayStartUtc
    );
    if (!hourlyRateCents) return 0;

    let cents = 0;

    for (const rule of payRules) {
      // Deine bestehende Logik:
      if (!ruleActiveOnDay(rule, dayKey, holidays)) continue;

      const percent = decimalToNumber(rule.percent);
      if (!percent) continue;

      const intervals = ruleIntervalsForDay(rule, dayStartUtc);

      let overlapTotalMinutes = 0;
      for (const [rStart, rEnd] of intervals) {
        overlapTotalMinutes += overlapMinutes(segStart, segEnd, rStart, rEnd);
      }
      if (!overlapTotalMinutes) continue;

      const overlapHours = overlapTotalMinutes / 60;
      const add = hourlyRateCents * (percent / 100) * overlapHours;
      cents += add;
    }

    return cents;
  }

  // Shifts splitten: Tagesgrenze = Berlin-Mitternacht (in UTC dargestellt)
  for (const s of shifts) {
    const actualStart = s.clockIn ?? s.start;
    const actualEnd = s.clockOut ?? s.end;

    if (!actualStart || !actualEnd) continue;
    if (actualEnd.getTime() <= actualStart.getTime()) continue;

    let cur = clamp(actualStart, monthStartUtc, nextMonthStartUtc);
    const hardEnd = clamp(actualEnd, monthStartUtc, nextMonthStartUtc);
    if (hardEnd.getTime() <= cur.getTime()) continue;

    while (cur.getTime() < hardEnd.getTime()) {
      const dStartUtc = berlinStartOfDayUtc(cur);
      const dEndUtc = berlinAddDaysUtc(dStartUtc, 1); // nächste Berlin-Mitternacht (UTC)
      const segEnd = new Date(Math.min(hardEnd.getTime(), dEndUtc.getTime()));

      const dayKey = berlinIsoDayKey(dStartUtc);

      if (days[dayKey]) {
        const hours = (segEnd.getTime() - cur.getTime()) / 3_600_000;

        days[dayKey].shifts.push({
          start: cur.toISOString(),
          end: segEnd.toISOString(),
          hours: round2(hours),
          code: s.shiftAbsence?.reason === 'SICKNESS' ? 'SICK' : null,
        });

        if (!s.shiftAbsence) {
          days[dayKey].supplementsCents += calcSupplementsCentsForSegment(
            dStartUtc,
            cur,
            segEnd
          );
        }
      }

      cur = segEnd;
    }
  }

  for (const vd of vacationDays) {
    const dayKey = berlinIsoDayKey(vd.date);
    if (days[dayKey]) {
      const weeklyHours = findWeeklyHoursForDate(user!.contracts, vd.date);
      days[dayKey].shifts.push({
        start: '-',
        end: '-',
        hours: round2(weeklyHours / 5),
        code: 'VACATION',
      });
    }
  }

  // Output sortieren: 1..daysInMonth (stabil)
  const out: TimeSheetDay[] = Array.from(
    { length: daysInMonth },
    (_, i) => i + 1
  ).map((d) => {
    const dayStartUtc = fromZonedTime(
      new Date(year, monthIndex, d, 0, 0, 0, 0),
      TZ
    );
    const key = berlinIsoDayKey(dayStartUtc);
    const entry = days[key] ?? {
      day: d,
      shifts: [],
      supplementsCents: 0,
      dayStartUtc,
    };

    return {
      day: entry.day,
      shifts: entry.shifts,
      supplements: centsToEuros2(entry.supplementsCents),
    };
  });

  const contract =
    pickContractForDate(user.contracts, addDays(monthStartUtc, 15)) ?? null;
  const plannedMonthlyHours = Number(contract?.weeklyHours ?? 0) * (52 / 12);

  return { timeSheet: out, plannedMonthlyHours };
}
