import type { NextApiRequest, NextApiResponse } from 'next';
import { recalculateKpiCache } from '@/lib/kpiCache';
import { isOk } from '@/lib/apiResponse';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') return res.status(405).end();

  const y = Number(req.query.y);
  const m = Number(req.query.m);
  const response = await recalculateKpiCache(y, m);
  if (isOk(response)) return res.status(201).json(response.caches);

  return res.status(401).json({ error: response.error });
}
