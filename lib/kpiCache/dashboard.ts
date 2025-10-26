import { failureResp, isOk, successResp } from '../apiResponse';
import { PayrollRow } from '../payroll';
import prisma from '@/lib/prismadb';
import { PayrollRowsData, readOrFetchPayrollData } from './payroll';
import {
  getDepsUpdatedAtForMonth,
  isStale,
  KpiGetShifts,
  kpiGetUsers,
  KpiGetUsers,
} from '.';
import { dateSortAsc } from '../dates';

export type DashboardPayload = {
  summary: {
    activeEmployees: number;
    totalHours: number;
    plannedHours: number;
    totalCost: number; // in €
    avgRate: number; // €/h
    totalVacationDays: number;
    usedVacationDays: number;
  };
  hoursByDay: Array<{ key: string; name: string; hours: number }>;
  costTrend: Array<{ name: string; cost: number }>; // letzte 6 Monate
};

async function buildDashboardSummary(
  rows: PayrollRow[],
  users: KpiGetUsers,
  shifts: KpiGetShifts
): Promise<DashboardPayload['summary']> {
  const totalMinutes = rows.reduce((a, r) => a + r.monthMinutes, 0);
  const totalHours = Math.round(totalMinutes / 60);
  const plannedMinutes = shifts.reduce((a, s) => {
    // Nur geplante Arbeitszeiten berücksichtigen
    if (s.code?.isWorkingShift && !s.shiftAbsence) {
      const begin = s.start;
      const finish = s.end;
      const duration = Math.max(0, finish.getTime() - begin.getTime());
      return a + Math.floor(duration / 60_000);
    }
    return a;
  }, 0);
  const plannedHours = Math.round(plannedMinutes / 60);
  const totalCostCents = rows.reduce((a, r) => a + r.grossCents, 0);
  const activeEmployees = rows.length;
  const avgRate =
    totalHours > 0
      ? Math.round((totalCostCents / 100 / totalHours) * 100) / 100
      : 0;
  const totalVacationDays = users.reduce((a, u) => {
    const contract = u.contracts?.find(
      (c) =>
        c.validFrom <= new Date() &&
        (!c.validUntil || c.validUntil >= new Date())
    );
    if (contract?.vacationDaysAnnual)
      return a + Number(contract.vacationDaysAnnual);
    return a;
  }, 0);
  const usedVacationDays = await prisma.vacationDay.count({
    where: {
      date: {
        gte: new Date(new Date().getFullYear(), 0, 1),
        lte: new Date(new Date().getFullYear(), 11, 31),
      },
    },
  });

  return {
    activeEmployees,
    totalHours,
    plannedHours,
    totalCost: Math.round(totalCostCents / 100), // € gerundet
    avgRate,
    totalVacationDays,
    usedVacationDays,
  };
}

function buildHoursByDayForMonth(
  y: number,
  m: number,
  shifts: Array<{
    start: Date;
    end: Date;
    clockIn?: Date | null;
    clockOut?: Date | null;
    code: { isWorkingShift: boolean } | null;
    shiftAbsence: { reason: string } | null;
  }>
) {
  const now = new Date();
  const start = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0));

  const buckets = new Map<string, number>(); // key => hours

  for (const s of shifts) {
    // Nicht berücksichtigen, wenn:
    // keine Stempelzeit => nicht erschienen oder geplante Schicht
    // oder shiftAbsence => Abwesenheit (Krank)
    if (!s.clockOut || !s.code || s.shiftAbsence) continue;
    const begin = s.clockIn ?? s.start;
    const finish = s.clockOut ?? s.end;
    if (finish <= start || begin >= end) continue;

    let t = new Date(Math.max(begin.getTime(), start.getTime()));
    const tEnd = new Date(Math.min(finish.getTime(), end.getTime()));
    t.setUTCMinutes(0, 0, 0); // stundenweise bucketing

    while (t < tEnd) {
      const next = new Date(t.getTime() + 3_600_000);
      const segEnd = next < tEnd ? next : tEnd;
      const h = (segEnd.getTime() - t.getTime()) / 3_600_000;
      const key = t.toLocaleDateString('en');
      buckets.set(key, (buckets.get(key) ?? 0) + h);
      t = next;
    }
  }

  return Array.from(buckets.entries())
    .sort((a, b) => dateSortAsc(a[0], b[0]))
    .map(([key, hours]) => {
      const [M, D, Y] = key.split('/').map(Number);
      const date = new Date(Date.UTC(Y, M - 1, D));
      const name = `${date.toLocaleDateString('de-DE', {
        weekday: 'short',
      })} ${D}.${M}.`;
      return { key, name, hours: Math.round(hours) };
    });
}

export async function recalcMonthDashboardBase(
  y: number,
  m: number,
  data?: { payrollData?: PayrollRowsData; userData?: KpiGetUsers }
) {
  if (Number.isNaN(y) || Number.isNaN(m))
    return failureResp('cache', undefined, 'Invalid Date Params');

  const { depsUpdatedAt, payrollRows, shifts, now } =
    await readOrFetchPayrollData(y, m, data?.payrollData);
  let users = data?.userData;
  if (!users) {
    users = await kpiGetUsers();
  }
  const summary = await buildDashboardSummary(payrollRows, users, shifts);
  const hoursByDay = buildHoursByDayForMonth(y, m, shifts);

  const dashboardKPIs = await prisma.kpiCache.upsert({
    where: {
      type_year_monthIndex: { type: 'DASHBOARD', year: y, monthIndex: m },
    },
    update: {
      payload: { summary, hoursByDay },
      calculationDoneAt: now,
      depsUpdatedAt,
    },
    create: {
      type: 'DASHBOARD',
      year: y,
      monthIndex: m,
      payload: { summary, hoursByDay },
      calculationDoneAt: now,
      depsUpdatedAt,
    },
  });

  return successResp('cache', dashboardKPIs);
}

export async function buildCostTrendLast6(anchor = new Date()) {
  const out: Array<{ name: string; cost: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(
      Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - i, 1)
    );
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();

    let cache = await prisma.kpiCache.findUnique({
      where: {
        type_year_monthIndex: { type: 'DASHBOARD', year: y, monthIndex: m },
      },
    });
    if (!cache) {
      const dashboardResponse = await recalcMonthDashboardBase(y, m);
      if (isOk(dashboardResponse)) {
        cache = dashboardResponse.cache;
      } else {
        continue;
      }
    }
    const cost = Number(
      (cache.payload as DashboardPayload)?.summary?.totalCost ?? 0
    );
    out.push({
      name: d.toLocaleDateString('de-DE', { month: 'short' }),
      cost: Math.round(cost),
    });
  }
  return out;
}

export async function recalcMonthDashboardFull(
  y: number,
  m: number,
  data?: { payrollData?: PayrollRowsData; userData?: KpiGetUsers }
) {
  const baseResponse = await recalcMonthDashboardBase(y, m, data);
  if (!isOk(baseResponse))
    return failureResp('cache', undefined, baseResponse.error);

  const costTrend = await buildCostTrendLast6(new Date(Date.UTC(y, m, 1)));
  const fullCache = await prisma.kpiCache.update({
    where: {
      type_year_monthIndex: { type: 'DASHBOARD', year: y, monthIndex: m },
    },
    data: {
      payload: {
        ...(baseResponse.cache.payload as DashboardPayload),
        costTrend,
      },
    },
  });
  return successResp('cache', fullCache);
}

export async function getOrRecalcDashboardKPIs(y: number, m: number) {
  const cache = await prisma.kpiCache.findUnique({
    where: {
      type_year_monthIndex: { type: 'DASHBOARD', year: y, monthIndex: m },
    },
  });

  const depsUpdatedAt = await getDepsUpdatedAtForMonth(y, m);
  const stale =
    isStale({ cache: cache ?? undefined, maxAgeMs: 1 * 60 * 60_000 }) ||
    !cache?.depsUpdatedAt ||
    depsUpdatedAt > (cache?.depsUpdatedAt ?? new Date(0));

  if (!stale && cache) {
    return successResp('cache', cache);
  }

  const updatedResponse = await recalcMonthDashboardFull(y, m, {
    payrollData: { depsUpdatedAt },
  });
  if (isOk(updatedResponse)) return successResp('cache', updatedResponse.cache);
  return failureResp('cache', undefined, updatedResponse.error);
}
