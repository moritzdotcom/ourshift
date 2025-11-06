import prisma from '@/lib/prismadb';
import { buildPayrollForMonth } from '../payroll';
import { failureResp, isOk, successResp } from '../apiResponse';
import { recalcMonthDashboardFull } from './dashboard';
import { recalcMonthPayroll } from './payroll';

export async function getDepsUpdatedAtForMonth(y: number, m: number) {
  const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));

  const [shiftMax, prMax, contractMax, userMax, holidayMax] = await Promise.all(
    [
      prisma.shift.aggregate({
        _max: { updatedAt: true },
        where: { NOT: [{ end: { lte: start } }], start: { lt: end } },
      }),
      prisma.payRule.aggregate({ _max: { updatedAt: true } }),
      prisma.digitalContract.aggregate({ _max: { updatedAt: true } }),
      prisma.user.aggregate({ _max: { updatedAt: true } }),
      prisma.holiday.aggregate({
        _max: { createdAt: true },
        where: { AND: [{ date: { gte: start } }, { date: { lte: end } }] },
      }),
    ]
  );

  return new Date(
    Math.max(
      shiftMax._max.updatedAt?.getTime() ?? 0,
      prMax._max.updatedAt?.getTime() ?? 0,
      contractMax._max.updatedAt?.getTime() ?? 0,
      userMax._max.updatedAt?.getTime() ?? 0,
      holidayMax._max.createdAt?.getTime() ?? 0
    )
  );
}

export function isStale(params: {
  cache?: { calculationDoneAt: Date; depsUpdatedAt?: Date | null };
  maxAgeMs?: number;
}) {
  const { cache, maxAgeMs } = params;
  if (!cache) return true;
  const now = Date.now();
  if (maxAgeMs && now - cache.calculationDoneAt.getTime() > maxAgeMs)
    return true;
  if (cache.depsUpdatedAt && cache.depsUpdatedAt > cache.calculationDoneAt)
    return true;
  return false;
}

export type KpiGetUsers = Awaited<ReturnType<typeof kpiGetUsers>>;
export async function kpiGetUsers() {
  return await prisma.user.findMany({
    select: {
      id: true,
      isActive: true,
      firstName: true,
      lastName: true,
      contracts: {
        select: {
          validFrom: true,
          validUntil: true,
          salaryMonthlyCents: true,
          hourlyRateCents: true,
          vacationDaysAnnual: true,
          weeklyHours: true,
          vacationBonus: true,
          christmasBonus: true,
        },
      },
      payRules: {
        omit: {
          createdAt: true,
          updatedAt: true,
          userId: true,
        },
      },
    },
  });
}

export type KpiGetShifts = Awaited<ReturnType<typeof kpiGetShifts>>;
export async function kpiGetShifts(y: number, m: number) {
  const start = new Date(y, m, 1, 0, 0, 0, 0);
  const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
  return await prisma.shift.findMany({
    where: {
      start: { lte: end },
      end: { gte: start },
    },
    include: {
      code: {
        omit: {
          id: true,
          description: true,
          label: true,
          color: true,
          sortOrder: true,
        },
      },
      shiftAbsence: { where: { status: 'APPROVED' }, select: { reason: true } },
    },
  });
}

export type KpiGetHolidays = Awaited<ReturnType<typeof kpiGetHolidays>>;
export async function kpiGetHolidays(y: number, m: number) {
  const start = new Date(y, m, 1, 0, 0, 0, 0);
  const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
  return await prisma.holiday.findMany({
    where: {
      AND: [{ date: { gte: start } }, { date: { lte: end } }],
    },
  });
}

export type KpiGetVacationDays = Awaited<ReturnType<typeof kpiGetVacationDays>>;
export async function kpiGetVacationDays(y: number, m: number) {
  const start = new Date(y, m, 1, 0, 0, 0, 0);
  const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
  return await prisma.vacationDay.findMany({
    where: {
      AND: [{ date: { gte: start } }, { date: { lte: end } }],
    },
  });
}

export async function recalculateKpiCache(y: any, m: any) {
  if (Number.isNaN(y) || Number.isNaN(m))
    return failureResp('caches', undefined, 'Invalid Date Params');

  const [users, shifts, holidays] = await Promise.all([
    kpiGetUsers(),
    kpiGetShifts(y, m),
    kpiGetHolidays(y, m),
  ]);

  const payrollRows = buildPayrollForMonth({
    year: y,
    monthIndex: m,
    users,
    shifts,
    holidays,
  });
  const depsUpdatedAt = await getDepsUpdatedAtForMonth(y, m);
  const now = new Date();

  const payrollData = {
    payrollRows,
    depsUpdatedAt,
    now,
    users,
    shifts,
    holidays,
  };
  const payrollResp = await recalcMonthPayroll(y, m, payrollData);
  const dashboardResp = await recalcMonthDashboardFull(y, m, {
    payrollData,
    userData: users,
  });

  const payrollKPIs = isOk(payrollResp) ? payrollResp.cache : undefined;
  const dashboardKPIs = isOk(dashboardResp) ? dashboardResp.cache : undefined;
  if (!isOk(payrollResp)) {
    return failureResp('caches', undefined, payrollResp.error);
  } else if (!isOk(dashboardResp)) {
    return failureResp('caches', undefined, dashboardResp.error);
  } else {
    return successResp('caches', {
      payroll: payrollKPIs,
      dashboard: dashboardKPIs,
    });
  }
}
