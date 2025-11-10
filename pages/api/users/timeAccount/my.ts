import { getCurrentUserId } from '@/lib/auth';
import { NextApiRequest, NextApiResponse } from 'next';
import {
  getOrRecalcTimeAccountKPIs,
  TimeAccountPayload,
} from '@/lib/kpiCache/timeAccount';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { ok, userId, error } = await getCurrentUserId(req);
  if (!ok) return res.status(401).json({ error });

  if (req.method === 'GET') {
    await handleGET(req, res, userId);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}

async function handleGET(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  const year = req.query.year || new Date().getFullYear();
  const month = req.query.month || new Date().getMonth();

  const { ok, cache, error } = await getOrRecalcTimeAccountKPIs(
    Number(year),
    Number(month)
  );

  if (!ok) return res.status(401).json({ error });

  const userData = (cache.payload as TimeAccountPayload).find(
    (d) => d.user.id === userId
  );
  return res.status(200).json(userData);
}
