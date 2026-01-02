import { authGuard } from '@/lib/auth';
import { getUserTimesheet, TimeSheetDay } from '@/lib/timesheet';
import { NextApiRequest, NextApiResponse } from 'next';

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

export type ApiGetUserTimesheetResponse = {
  timeSheet: TimeSheetDay[];
  plannedMonthlyHours: number;
};

async function handleGET(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  const { year, month } = req.query;
  if (typeof year !== 'string' || typeof month !== 'string') {
    return res.status(400).json({ error: 'Invalid year or month' });
  }

  try {
    const { timeSheet, plannedMonthlyHours } = await getUserTimesheet(
      userId,
      Number(year),
      Number(month)
    );

    return res.status(200).json({ timeSheet, plannedMonthlyHours });
  } catch (e: any) {
    return res.status(400).json({ error: e?.message ?? 'Unknown error' });
  }
}
