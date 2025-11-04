import { authGuard } from '@/lib/auth';
import { calculateWorkingStats } from '@/lib/timeAccount';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { ok, error } = await authGuard(req, 'MANAGER');
  if (!ok) return res.status(401).json({ error });

  if (req.method === 'GET') {
    await handleGET(req, res);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}

async function handleGET(req: NextApiRequest, res: NextApiResponse) {
  const year = req.query.year || new Date().getFullYear();
  const month = req.query.month || new Date().getMonth();
  const stats = await calculateWorkingStats(Number(year), Number(month));
  return res.status(200).json(stats);
}
