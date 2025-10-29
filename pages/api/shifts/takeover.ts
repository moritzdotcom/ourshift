import { Prisma } from '@/generated/prisma';
import { getCurrentUserId } from '@/lib/auth';
import prisma from '@/lib/prismadb';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { ok, userId, error } = await getCurrentUserId(req);
  if (!ok) return res.status(401).json({ error });

  if (req.method === 'GET') {
    await handleGET(req, res, userId);
  } else if (req.method === 'PUT') {
    await handlePUT(req, res, userId);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}

export type TakeoverShift = Prisma.ShiftGetPayload<{
  include: {
    code: true;
    shiftAbsence: true;
    user: { select: { firstName: true; lastName: true } };
  };
}>;

async function handleGET(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  const gracePeriod = 60_000 * 120; // 120 Minuten
  const nowWithGP = new Date(new Date().getTime() - gracePeriod);
  const maxTime = new Date(nowWithGP.getTime() + 24 * 60 * 60 * 1000);

  try {
    const shifts = await prisma.shift.findMany({
      where: {
        start: { gte: nowWithGP, lte: maxTime },
        shiftAbsence: null,
        userId: { not: userId },
        clockIn: null,
        clockOut: null,
      },
      orderBy: {
        start: 'asc',
      },
      take: 2,
      include: {
        code: true,
        shiftAbsence: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });

    return res.status(200).json(shifts);
  } catch (err) {
    return res.status(500).json({ error: 'Serverfehler' });
  }
}

async function handlePUT(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  const { shiftId } = req.body;
  try {
    const shift = await prisma.shift.update({
      where: {
        id: shiftId,
      },
      data: {
        userId,
      },
      include: {
        code: {
          select: {
            code: true,
            label: true,
            color: true,
            isWorkingShift: true,
          },
        },
        changeRequest: {
          omit: {
            createdAt: true,
            shiftId: true,
            userId: true,
            updatedAt: true,
          },
        },
        shiftAbsence: { select: { id: true, reason: true } },
      },
    });

    return res.status(200).json(shift);
  } catch (err) {
    return res.status(500).json({ error: 'Serverfehler' });
  }
}
