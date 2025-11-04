import prisma from '@/lib/prismadb';
import { dateToHuman } from './dates';

export function employedInMonth(
  u: { employmentStart: Date | null; terminationDate: Date | null },
  year: number,
  month: number
) {
  const bom = new Date(year, month, 1);
  const eom = new Date(year, month + 1, 1);

  if (!u.employmentStart) return false;

  const es = new Date(u.employmentStart);

  if (u.terminationDate) {
    const td = new Date(u.terminationDate);
    return td > bom && es < eom;
  }

  return es < eom;
}

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
  const bom = new Date(year, month, 0).getTime();
  const eom = new Date(year, month + 1, 0).getTime();
  return shifts.filter(
    (s) => s.end.getTime() >= bom && s.start.getTime() <= eom
  );
}

function vacationDaysForMonth<
  VD extends {
    date: Date;
  }
>(vacationDays: VD[], year: number, month: number) {
  const bom = new Date(year, month, 0).getTime();
  const eom = new Date(year, month + 1, 0).getTime();
  return vacationDays.filter(
    (d) => d.date.getTime() >= bom && d.date.getTime() <= eom
  );
}

function totalShiftMin(shift: {
  start: Date;
  end: Date;
  clockIn: Date | null;
  clockOut: Date | null;
  shiftAbsence: {
    reason: 'SICKNESS';
  } | null;
}) {
  if (shift.clockIn && shift.clockOut)
    return (shift.clockOut.getTime() - shift.clockIn.getTime()) / 60_000;
  if (shift.shiftAbsence)
    return (shift.end.getTime() - shift.start.getTime()) / 60_000;
  return 0;
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
  const boy = new Date(year, 0, 0);
  const eoy = new Date(year + 1, 0, 0);

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      employmentStart: { lte: eoy },
      OR: [{ terminationDate: null }, { terminationDate: { gte: boy } }],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      shifts: {
        where: {
          start: { lte: eoy },
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
      const start = new Date(Math.max(c.validFrom.getTime(), boy.getTime()));
      const end = new Date(
        c.validUntil ? Math.min(c.validUntil.getTime(), eoy.getTime()) : eoy
      );
      const months = monthsBetweenInclusive(start, end);
      console.log(
        `${u.firstName} ${dateToHuman(start)}-${dateToHuman(end)} ${months}`
      );
      entry.yVacationPlan += ((c.vacationDaysAnnual || 0) / 12) * months;

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
            const totalHours = totalShiftMin(s) / 60;
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
          entry.mSickDays = sickDaySetM.size;
        } else {
          for (const s of shifts) {
            entry.yHours += totalShiftMin(s) / 60;
            if (s.shiftAbsence) {
              sickDaySet.add(
                `${s.start.getFullYear()}${s.start.getMonth()}${s.start.getDate()}`
              );
            }
          }
        }
      });
    }
    entry.ySickDays = sickDaySet.size;
    list.push({ ...entry, overtime: entry.yHours - entry.yHoursPlan });
  }
  return list;
}
