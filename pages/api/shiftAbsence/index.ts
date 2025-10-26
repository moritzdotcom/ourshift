import { getCurrentUserId } from '@/lib/auth';
import prisma from '@/lib/prismadb';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { ok, userId, error } = await getCurrentUserId(req);
  if (!ok) return res.status(401).json({ error });

  if (req.method === 'POST') {
    await handlePOST(req, res, userId);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}

async function handlePOST(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  const { shiftId, reason } = req.body;

  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
  });

  if (!shift || shift.userId !== userId) {
    return res.status(403).json({ error: 'Not Authorized' });
  }

  const created = await prisma.shiftAbsence.create({
    data: {
      reason: reason,
      shiftId,
      userId,
      status: 'APPROVED',
    },
  });

  return res.status(201).json(created);
}
