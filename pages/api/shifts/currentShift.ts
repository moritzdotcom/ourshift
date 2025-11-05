import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prismadb';
import { getCurrentUserId } from '@/lib/auth';

type ShiftLite = {
  id: string;
  start: string; // ISO
  end: string; // ISO
  clockIn: string | null;
  clockOut: string | null;
  code: { label: string; color: string } | null;
};

export type ApiGetCurrentShiftResponse = {
  current: ShiftLite | null;
  next: ShiftLite | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiGetCurrentShiftResponse | { error: string }>
) {
  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Method not allowed' });

  const { ok, userId } = await getCurrentUserId(req);
  if (!ok) return res.status(401).json({ error: 'Unauthorized' });

  const now = new Date();

  // "current": läuft jetzt ODER eingestempelt aber noch nicht ausgestempelt
  const current = await prisma.shift.findFirst({
    where: {
      userId,
      shiftAbsence: null,
      OR: [
        { AND: [{ start: { lte: now } }, { end: { gte: now } }] },
        { AND: [{ clockIn: { not: null } }, { clockOut: null }] },
      ],
    },
    orderBy: { start: 'asc' },
    select: {
      id: true,
      start: true,
      end: true,
      clockIn: true,
      clockOut: true,
      code: { select: { label: true, color: true } },
    },
  });

  const next = await prisma.shift.findFirst({
    where: {
      userId,
      shiftAbsence: null,
      start: { gt: now },
    },
    orderBy: { start: 'asc' },
    select: {
      id: true,
      start: true,
      end: true,
      clockIn: true,
      clockOut: true,
      code: { select: { label: true, color: true } },
    },
  });

  const toLite = (s: any): ShiftLite => ({
    id: s.id,
    start: s.start.toISOString(),
    end: s.end.toISOString(),
    clockIn: s.clockIn ? s.clockIn.toISOString() : null,
    clockOut: s.clockOut ? s.clockOut.toISOString() : null,
    code: s.code ? { label: s.code.label, color: s.code.color } : null,
  });

  res.json({
    current: current ? toLite(current) : null,
    next: next ? toLite(next) : null,
  });
}
