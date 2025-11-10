import { failureResp, isOk, successResp } from '../apiResponse';
import { calculateWorkingStats, WorkingStatsEntry } from '../timeAccount';
import prisma from '../prismadb';

export type TimeAccountPayload = WorkingStatsEntry[];

export async function recalcMonthTimeAccount(y: any, m: any) {
  if (Number.isNaN(y) || Number.isNaN(m))
    return failureResp('cache', undefined, 'Invalid Date Params');

  const now = new Date();

  const workingStats = await calculateWorkingStats(y, m);

  const timeAccountKpis = await prisma.kpiCache.upsert({
    where: {
      type_year_monthIndex: { type: 'TIMEACCOUNT', year: y, monthIndex: m },
    },
    update: {
      payload: workingStats as any,
      calculationDoneAt: now,
      depsUpdatedAt: now,
    },
    create: {
      type: 'TIMEACCOUNT',
      year: y,
      monthIndex: m,
      payload: workingStats as any,
      calculationDoneAt: now,
      depsUpdatedAt: now,
    },
  });

  return successResp('cache', timeAccountKpis);
}

export async function getOrRecalcTimeAccountKPIs(
  y: number,
  m: number,
  forceRecalc?: boolean
) {
  if (forceRecalc) {
    const resp = await recalcMonthTimeAccount(y, m);
    if (isOk(resp)) return successResp('cache', resp.cache);
    return failureResp('cache', undefined, resp.error);
  }
  const cache = await prisma.kpiCache.findUnique({
    where: {
      type_year_monthIndex: { type: 'TIMEACCOUNT', year: y, monthIndex: m },
    },
  });

  if (cache) return successResp('cache', cache);

  const updatedResponse = await recalcMonthTimeAccount(y, m);
  if (isOk(updatedResponse)) return successResp('cache', updatedResponse.cache);
  return failureResp('cache', undefined, updatedResponse.error);
}
