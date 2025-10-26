import type { NextApiRequest, NextApiResponse } from 'next';
import { getOrRecalcDashboardKPIs } from '@/lib/kpiCache/dashboard';
import { isOk } from '@/lib/apiResponse';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const now = new Date();
  const y = Number(req.query.y ?? now.getFullYear());
  const m = Number(req.query.m ?? now.getMonth());

  const kpiResponse = await getOrRecalcDashboardKPIs(y, m);
  if (isOk(kpiResponse)) return res.status(201).json(kpiResponse.cache.payload);
  return res.status(401).json({ error: kpiResponse.error });
}
