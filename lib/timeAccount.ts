import prisma from '@/lib/prismadb';

function monthsBetweenInclusive(start: Date, end: Date) {
  if (end < start) return 0;

  // Auf den 1. des Monats normalisieren (optional, macht’s stabiler)
  const sY = start.getFullYear();
  const sM = start.getMonth();
  const eY = end.getFullYear();
  const eM = end.getMonth();

  return (eY - sY) * 12 + (eM - sM) + 1;
}

function shiftsForMonth<
  S extends {
    start: Date;
    end: Date;
  }
>(shifts: S[], year: number, month: number) {
  const bom = new Date(year, month, 1, 0, 0, 0, 0).getTime();
  const eom = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
  return shifts.filter(
    (s) => s.end.getTime() >= bom && s.start.getTime() <= eom
  );
}

function vacationDaysForMonth<
  VD extends {
    date: Date;
  }
>(vacationDays: VD[], year: number, month: number) {
  const bom = new Date(year, month, 1, 0, 0, 0, 0).getTime();
  const eom = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
  return vacationDays.filter(
    (d) => d.date.getTime() >= bom && d.date.getTime() <= eom
  );
}

function trailingVacationDaysAtMonthEnd<
  VD extends {
    date: Date;
  }
>(
  days: VD[],
  year: number,
  month0: number // 0-basiert
): VD[] {
  const vacationDays = vacationDaysForMonth(days, year, month0);
  const lastDay = new Date(year, month0 + 1, 0).getDate();

  const byDay = new Map<number, VD>();
  for (const vd of vacationDays) byDay.set(vd.date.getDate(), vd);

  if (!byDay.has(lastDay)) return [];

  // volle Kette rückwärts zählen
  let k = 1;
  while (byDay.has(lastDay - k)) k++;

  if (k > 4) return []; // zu lang -> 0 laut Anforderung

  // die letzten k Tage in natürlicher Reihenfolge zurückgeben
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
  month0: number
) {
  const bom = new Date(year, month0, 1, 0, 0, 0, 0);
  const eom = new Date(year, month0 + 1, 0, 23, 59, 59, 999);
  const s = start < bom ? bom : start;
  const e = end > eom ? eom : end;
  if (e <= s) return null;
  return { s, e };
}

function shiftMinutesForMonth(
  s: {
    start: Date;
    end: Date;
    clockIn: Date | null;
    clockOut: Date | null;
    shiftAbsence: { reason: 'SICKNESS' } | null;
  },
  year: number,
  month0: number
) {
  const shownStart = s.clockIn ?? s.start;
  const shownEnd = s.clockOut ?? s.end;
  const clamped = clampIntervalToMonth(shownStart, shownEnd, year, month0);
  if (!clamped) return 0;
  const mins = minutesInRange(clamped.s, clamped.e);
  // Bei Krankheit zählst du plan (start/end) – aber auch clampen!
  if (s.shiftAbsence) return mins;
  // Ohne Stempel & ohne Absence: 0
  if (!s.clockIn || !s.clockOut) return 0;
  return mins;
}

export type WorkingStatsEntry = {
  user: { id: string; firstName: string; lastName: string };
  mHours: number; // Ist Stunden Monat
  mHoursPlan: number; // Soll Stunden Monat
  yHours: number; // Ist Stunden Jahr
  yHoursPlan: number; // Soll Stunden Jahr
  overtime: number; // Überstunden (Stunden, +/−)
  mVacation: number; // Urlaubstage Monat (Ist)
  yVacation: number; // Urlaubstage Jahr (Ist)
  yVacationPlan: number; // Urlaubstage Jahr (Soll)
  rVacationPrevYear: number; // Resturlaub Vorjahr
  mSickDays: number; // Kranktage Monat
  ySickDays: number; // Kranktage Jahr
};

export async function calculateWorkingStats(
  year: number,
  month: number
): Promise<WorkingStatsEntry[]> {
  const boy = new Date(year, 0, 1, 0, 0, 0, 0);
  const eoy = new Date(year + 1, 0, 0, 23, 59, 59, 999);
  const eotf = new Date(year, month + 1, 0, 23, 59, 59, 999);

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
      contracts: {
        where: {
          validFrom: { lte: eotf },
          OR: [{ validUntil: null }, { validUntil: { gte: boy } }],
        },
        select: {
          weeklyHours: true,
          vacationDaysAnnual: true,
          validFrom: true,
          validUntil: true,
        },
      },
      vacationDays: { select: { date: true } },
    },
  });

  const list = [];
  for (const u of users) {
    const entry = {
      user: { id: u.id, firstName: u.firstName, lastName: u.lastName },
      mHours: 0, // X
      mHoursPlan: 0, // X
      yHours: 0, // X
      yHoursPlan: 0, // X
      overtime: 0, // X
      mVacation: 0, // X
      yVacation: 0, // X
      yVacationPlan: 0, // X
      rVacationPrevYear: 0, //
      mSickDays: 0, // X
      ySickDays: 0, // X
    };

    const sickDaySet = new Set();

    for (const c of u.contracts) {
      const start = new Date(
        Math.max(c.validFrom.setHours(0, 0, 0, 0), boy.getTime())
      );
      const end = new Date(
        c.validUntil
          ? Math.min(c.validUntil.setHours(23, 59, 59, 999), eotf.getTime())
          : eotf
      );
      const endOfYear = new Date(
        c.validUntil
          ? Math.min(c.validUntil.setHours(23, 59, 59, 999), eoy.getTime())
          : eoy
      );
      const totalMonths = monthsBetweenInclusive(start, endOfYear);
      entry.yVacationPlan += ((c.vacationDaysAnnual || 0) / 12) * totalMonths;

      const months = monthsBetweenInclusive(start, end);

      Array.from({ length: months }).forEach((_, i) => {
        const m = start.getMonth() + i;
        const shifts = shiftsForMonth(u.shifts, year, m);
        const vacationDays = vacationDaysForMonth(
          u.vacationDays,
          year,
          m
        ).length;

        const monthlyHoursPlan = Math.round(Number(c.weeklyHours) * 4.35);

        entry.yVacation += vacationDays;
        entry.yHoursPlan += monthlyHoursPlan;

        if (m === month) {
          const sickDaySetM = new Set();
          entry.mHoursPlan = monthlyHoursPlan;
          entry.mVacation = vacationDays;

          for (const s of shifts) {
            const totalHours = shiftMinutesForMonth(s, year, m) / 60;
            entry.yHours += totalHours;
            entry.mHours += totalHours;
            if (s.shiftAbsence) {
              sickDaySet.add(
                `${s.start.getFullYear()}${s.start.getMonth()}${s.start.getDate()}`
              );
              sickDaySetM.add(
                `${s.start.getFullYear()}${s.start.getMonth()}${s.start.getDate()}`
              );
            }
          }
          // Urlaubstage zu Ist Stunden addieren
          const prevMonthVacationDays = trailingVacationDaysAtMonthEnd(
            u.vacationDays,
            year,
            m - 1
          ).length;

          const fullVacationWeeks = Math.floor(
            (vacationDays + prevMonthVacationDays) / 5
          );
          const vacationHours = fullVacationWeeks * Number(c.weeklyHours || 0);
          entry.mHours += vacationHours;

          entry.mSickDays = sickDaySetM.size;
        } else {
          for (const s of shifts) {
            entry.yHours += shiftMinutesForMonth(s, year, m) / 60;
            if (s.shiftAbsence) {
              sickDaySet.add(
                `${s.start.getFullYear()}${s.start.getMonth()}${s.start.getDate()}`
              );
            }
          }
        }
      });
      // Urlaubstage zu Ist Stunden addieren
      const fullVacationWeeks = Math.floor(entry.yVacation / 5);
      entry.yHours += fullVacationWeeks * Number(c.weeklyHours || 0);
    }

    entry.ySickDays = sickDaySet.size;
    list.push({ ...entry, overtime: entry.yHours - entry.yHoursPlan });
  }
  return list;
}
