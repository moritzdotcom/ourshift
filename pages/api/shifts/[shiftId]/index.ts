import { authGuard } from '@/lib/auth';
import prisma from '@/lib/prismadb';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { shiftId } = req.query;
  if (typeof shiftId !== 'string')
    return res.status(401).json({ error: 'ShiftId is required' });

  const { ok, error } = await authGuard(req, 'MANAGER');
  if (!ok) return res.status(401).json({ error });

  if (req.method === 'PUT') {
    await handlePUT(req, res, shiftId);
  } else if (req.method === 'DELETE') {
    await handleDELETE(req, res, shiftId);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}

async function handlePUT(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string
) {
  const { clockIn, clockOut } = req.body;

  const updated = await prisma.shift.update({
    where: { id },
    data: {
      clockIn: new Date(clockIn),
      clockInSource: 'MANUAL',
      clockOut: new Date(clockOut),
      clockOutSource: 'MANUAL',
    },
  });

  return res.status(201).json(updated);
}

async function handleDELETE(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string
) {
  const deleted = await prisma.shift.delete({
    where: { id },
  });

  return res.status(201).json(deleted);
}
