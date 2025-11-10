import { failureResp, isOk, successResp } from '../apiResponse';
import { calculateWorkingStats, WorkingStatsEntry } from '../timeAccount';
import prisma from '../prismadb';
import { getDepsUpdatedAtForMonth, isStale } from '.';

export type TimeAccountPayload = WorkingStatsEntry[];

export async function recalcMonthTimeAccount(
  y: any,
  m: any,
  data?: { depsUpdatedAt?: Date }
) {
  if (Number.isNaN(y) || Number.isNaN(m))
    return failureResp('cache', undefined, 'Invalid Date Params');

  const depsUpdatedAt =
    data?.depsUpdatedAt || (await getDepsUpdatedAtForMonth(y, m));

  const now = new Date();

  const workingStats = await calculateWorkingStats(y, m);

  const timeAccountKpis = await prisma.kpiCache.upsert({
    where: {
      type_year_monthIndex: { type: 'TIMEACCOUNT', year: y, monthIndex: m },
    },
    update: {
      payload: workingStats as any,
      calculationDoneAt: now,
      depsUpdatedAt,
    },
    create: {
      type: 'TIMEACCOUNT',
      year: y,
      monthIndex: m,
      payload: workingStats as any,
      calculationDoneAt: now,
      depsUpdatedAt,
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

  const depsUpdatedAt = await getDepsUpdatedAtForMonth(y, m);
  const stale =
    isStale({ cache: cache ?? undefined }) ||
    !cache?.depsUpdatedAt ||
    depsUpdatedAt > (cache?.depsUpdatedAt ?? new Date(0));

  if (!stale && cache) {
    return successResp('cache', cache);
  }

  const updatedResponse = await recalcMonthTimeAccount(y, m, {
    depsUpdatedAt,
  });
  if (isOk(updatedResponse)) return successResp('cache', updatedResponse.cache);
  return failureResp('cache', undefined, updatedResponse.error);
}
