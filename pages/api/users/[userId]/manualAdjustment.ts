import { authGuard } from '@/lib/auth';
import { hashPassword, hashPin } from '@/lib/password';
import prisma from '@/lib/prismadb';
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
  id: string
) {
  const { year, hoursAdjustment } = req.body;

  const updated = await prisma.manualAdjustment.upsert({
    where: {
      userId_year: {
        userId: id,
        year: Number(year),
      },
    },
    update: {
      hoursAdjustment: hoursAdjustment,
    },
    create: {
      userId: id,
      year: Number(year),
      hoursAdjustment: hoursAdjustment,
    },
  });

  return res.status(200).json(updated);
}
