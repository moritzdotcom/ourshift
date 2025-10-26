import { getCurrentUserId } from '@/lib/auth';
import prisma from '@/lib/prismadb';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { shiftId } = req.query;
  if (typeof shiftId !== 'string')
    return res.status(401).json({ error: 'ShiftId is required' });

  const { ok, userId, error } = await getCurrentUserId(req);
  if (!ok) return res.status(401).json({ error });
  if (req.method === 'POST') {
    await handlePOST(req, res, shiftId, userId);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}

async function handlePOST(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string,
  userId: string
) {
  const { clockInSource } = req.body;
  const shift = await prisma.shift.findFirst({ where: { id, userId } });
  if (!shift) return res.status(404).json({ error: 'Shift Not Found' });

  const updated = await prisma.shift.update({
    where: { id },
    data: {
      clockIn: shift?.clockIn || new Date(),
      clockInSource,
    },
  });

  return res.status(201).json(updated);
}
