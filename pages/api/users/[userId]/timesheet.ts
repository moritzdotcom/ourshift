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

function toDateOrThrow(v: unknown, name: string): Date {
  if (typeof v !== 'string') throw new Error(`Missing query param: ${name}`);
  const d = new Date(v);
  if (Number.isNaN(d.getTime()))
    throw new Error(`Invalid date for ${name}: ${v}`);
  return d;
}

async function handleGET(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const from = toDateOrThrow(req.query.from, 'from');
    const to = toDateOrThrow(req.query.to, 'to');
    if (from.getTime() > to.getTime())
      return res.status(400).json({ error: '`from` must be <= `to`' });

    const { timeSheet, plannedMonthlyHours } = await getUserTimesheet(
      userId,
      from,
      to
    );

    return res.status(200).json({ timeSheet, plannedMonthlyHours });
  } catch (e: any) {
    return res.status(400).json({ error: e?.message ?? 'Unknown error' });
  }
}
