import { getCurrentUserId } from '@/lib/auth';
import prisma from '@/lib/prismadb';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { ok, userId, error } = await getCurrentUserId(req);
  if (!ok) return res.status(401).json({ error });

  const { shiftAbsenceId } = req.query;
  if (typeof shiftAbsenceId !== 'string') {
    return res.status(401).json({ error: 'ID required' });
  }
  if (req.method === 'DELETE') {
    await handleDELETE(req, res, shiftAbsenceId, userId);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}

async function handleDELETE(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string,
  userId: string
) {
  const deleted = await prisma.shiftAbsence.delete({
    where: { id, userId },
  });

  return res.status(201).json(deleted);
}
