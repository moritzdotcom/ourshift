import { authGuard } from '@/lib/auth';
import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prismadb';
import { minutesToRoundedHours } from '@/lib/dates';
import { pickContractForDate } from '@/lib/digitalContract';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { ok, error } = await authGuard(req, 'MANAGER');
  if (!ok) return res.status(401).json({ error });

  const { userId } = req.query;
  if (typeof userId !== 'string') {
    return res.status(400).json({ error: 'Invalid userId' });
  }

  if (req.method === 'GET') {
    await handleGET(req, res, userId);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}

type UserTimeAccountMonthlyData = {
  month: number;
  workedHours: number;
  vacationHours: number;
  sickHours: number;
  totalHours: number;
  plannedHours: number;
  overtime: number;
  totalVacation: number;
  plannedVacation: number;
  sickDays: number;
  averageSalaryCents: number;
}[];

export type ApiUserTimeAccountResponse = {
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
  year: number;
  monthlyData: UserTimeAccountMonthlyData;
  manualAdjustment: number;
};

async function handleGET(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string
) {
  const year = req.query.year || new Date().getFullYear();

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      firstName: true,
      lastName: true,
      contracts: true,
      shifts: {
        where: {
          start: {
            gte: new Date(Number(year), 0, 1),
            lt: new Date(Number(year) + 1, 0, 1),
          },
        },
        select: {
          clockIn: true,
          clockOut: true,
          start: true,
          shiftAbsence: {
            where: { status: 'APPROVED' },
            select: { reason: true },
          },
        },
      },
      vacationDays: {
        where: {
          date: {
            gte: new Date(Number(year), 0, 1),
            lt: new Date(Number(year) + 1, 0, 1),
          },
        },
      },
      manualAdjustments: {
        where: { year: Number(year) },
        select: { hoursAdjustment: true },
      },
    },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const data: UserTimeAccountMonthlyData = [];

  for (let month = 0; month < 12; month++) {
    const monthShifts = user.shifts.filter(
      (shift) => shift.start.getMonth() === month
    );
    const monthContracts = user.contracts.filter((contract) => {
      const contractStart = contract.validFrom;
      const contractEnd = contract.validUntil || new Date();
      return (
        (contractStart.getFullYear() < Number(year) ||
          (contractStart.getFullYear() === Number(year) &&
            contractStart.getMonth() <= month)) &&
        (contractEnd.getFullYear() > Number(year) ||
          (contractEnd.getFullYear() === Number(year) &&
            contractEnd.getMonth() >= month))
      );
    });

    let workedMinutes = 0;
    let sickDays = 0;
    let sickMinutes = 0;

    for (const shift of monthShifts) {
      const start = shift.clockIn;
      const end = shift.clockOut;
      if (shift.shiftAbsence?.reason === 'SICKNESS') {
        const contract = pickContractForDate(monthContracts, shift.start);
        if (contract && contract.weeklyHours) {
          const dailyHours = contract.weeklyHours.toNumber() / 5; // 5 Arbeitstage pro Woche
          sickMinutes += dailyHours * 60;
        }
        sickDays += 1;
        continue;
      }
      if (!start || !end) continue;
      const diff = (end.getTime() - start.getTime()) / (1000 * 60); // minutes
      workedMinutes += diff;
    }

    let plannedMinutes = 0;
    let monthlyVacationGranted = 0;
    let averageSalaryCents = 0;

    for (const contract of monthContracts) {
      if (!contract.weeklyHours) continue;
      const contractStart = contract.validFrom;
      const contractEnd =
        contract.validUntil || new Date(Number(year) + 1, 0, 1);
      const monthStart = new Date(Number(year), month, 1);
      const monthEnd = new Date(Number(year), month + 1, 0);

      const effectiveStart =
        contractStart > monthStart ? contractStart : monthStart;
      const effectiveEnd = contractEnd < monthEnd ? contractEnd : monthEnd;

      const daysInMonth = Math.round(
        (effectiveEnd.getTime() - effectiveStart.getTime()) /
          (1000 * 60 * 60 * 24) +
          1
      );
      const daysInFullMonth = monthEnd.getDate();
      const weeksInMonth = (daysInMonth / daysInFullMonth) * (52 / 12);

      monthlyVacationGranted +=
        ((contract.vacationDaysAnnual || 0) / 12) *
        (daysInMonth / daysInFullMonth);
      plannedMinutes += weeksInMonth * (contract.weeklyHours.toNumber() * 60);
      averageSalaryCents +=
        (contract.hourlyRateCents || 0) * (daysInMonth / daysInFullMonth);
    }

    let vacationMinutes = 0;
    let vacationDaysInMonth = 0;
    for (const vd of user.vacationDays) {
      if (vd.date.getMonth() === month) {
        // Annahme: 8 Stunden pro Urlaubstag
        vacationDaysInMonth += 1;

        const contract = pickContractForDate(monthContracts, vd.date);
        if (contract && contract.weeklyHours) {
          const dailyHours = contract.weeklyHours.toNumber() / 5; // 5 Arbeitstage pro Woche
          vacationMinutes += dailyHours * 60;
        }
      }
    }
    const totalMinutes = workedMinutes + vacationMinutes + sickMinutes;

    data.push({
      month: month,
      workedHours: minutesToRoundedHours(workedMinutes),
      vacationHours: minutesToRoundedHours(vacationMinutes),
      sickHours: minutesToRoundedHours(sickMinutes),
      totalHours: minutesToRoundedHours(totalMinutes),
      plannedHours: minutesToRoundedHours(plannedMinutes),
      overtime: minutesToRoundedHours(totalMinutes - plannedMinutes),
      totalVacation: vacationDaysInMonth,
      plannedVacation: monthlyVacationGranted,
      sickDays: sickDays,
      averageSalaryCents: Math.round(averageSalaryCents),
    });
  }

  return res.status(200).json({
    user: {
      id,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    year: Number(year),
    monthlyData: data,
    manualAdjustment:
      user.manualAdjustments[0]?.hoursAdjustment?.toNumber() || 0,
  });
}
