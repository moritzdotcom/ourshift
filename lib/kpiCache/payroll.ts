import prisma from '@/lib/prismadb';
import {
  getDepsUpdatedAtForMonth,
  isStale,
  kpiGetHolidays,
  kpiGetShifts,
  kpiGetUsers,
} from '.';
import { failureResp, isOk, successResp } from '../apiResponse';
import { buildPayrollForMonth, PayrollRow } from '../payroll';

export type PayrollPayload = PayrollRow[];

export type PayrollRowsData = {
  payrollRows?: ReturnType<typeof buildPayrollForMonth>;
  users?: Awaited<ReturnType<typeof kpiGetUsers>>;
  shifts?: Awaited<ReturnType<typeof kpiGetShifts>>;
  holidays?: Awaited<ReturnType<typeof kpiGetHolidays>>;
  depsUpdatedAt?: Date;
  now?: Date;
};

export async function readOrFetchPayrollData(
  y: number,
  m: number,
  data?: PayrollRowsData
) {
  const depsUpdatedAt =
    data?.depsUpdatedAt || (await getDepsUpdatedAtForMonth(y, m));
  const now = data?.now || new Date();

  if (data?.payrollRows && data.shifts) {
    return {
      payrollRows: data.payrollRows,
      depsUpdatedAt,
      shifts: data.shifts,
      now,
    };
  } else if (data?.payrollRows) {
    const shifts = data?.shifts || (await kpiGetShifts(y, m));
    return { payrollRows: data.payrollRows, depsUpdatedAt, shifts, now };
  }
  const users = data?.users || (await kpiGetUsers());
  const shifts = data?.shifts || (await kpiGetShifts(y, m));
  const holidays = data?.holidays || (await kpiGetHolidays(y, m));
  const payrollRows =
    data?.payrollRows ||
    buildPayrollForMonth({
      year: y,
      monthIndex: m,
      users,
      shifts,
      holidays,
    });
  return { payrollRows, depsUpdatedAt, shifts, now };
}

export async function recalcMonthPayroll(
  y: any,
  m: any,
  data?: PayrollRowsData
) {
  if (Number.isNaN(y) || Number.isNaN(m))
    return failureResp('cache', undefined, 'Invalid Date Params');

  const { depsUpdatedAt, payrollRows, now } = await readOrFetchPayrollData(
    y,
    m,
    data
  );

  const payrollKPIs = await prisma.kpiCache.upsert({
    where: {
      type_year_monthIndex: { type: 'PAYROLL', year: y, monthIndex: m },
    },
    update: {
      payload: payrollRows as any,
      calculationDoneAt: now,
      depsUpdatedAt,
    },
    create: {
      type: 'PAYROLL',
      year: y,
      monthIndex: m,
      payload: payrollRows as any,
      calculationDoneAt: now,
      depsUpdatedAt,
    },
  });

  return successResp('cache', payrollKPIs);
}

export async function getOrRecalcPayrollKPIs(y: number, m: number) {
  const cache = await prisma.kpiCache.findUnique({
    where: {
      type_year_monthIndex: { type: 'PAYROLL', year: y, monthIndex: m },
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

  const updatedResponse = await recalcMonthPayroll(y, m, {
    depsUpdatedAt,
  });
  if (isOk(updatedResponse)) return successResp('cache', updatedResponse.cache);
  return failureResp('cache', undefined, updatedResponse.error);
}
