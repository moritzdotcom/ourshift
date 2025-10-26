import { Prisma } from '@/generated/prisma';
import prisma from '@/lib/prismadb';
import { buildShiftWhereQuery } from '@/lib/shift';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    await handleGET(req, res);
  } else if (req.method === 'POST') {
    await handlePOST(req, res);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}

export type ApiGetShiftsResponse = Prisma.ShiftGetPayload<{
  include: { code: true; shiftAbsence: true };
}>[];

async function handleGET(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { where, error } = buildShiftWhereQuery(
      req.query.from,
      req.query.to,
      'contained'
    );
    if (error) return res.status(400).json({ error });

    const shifts = await prisma.shift.findMany({
      where,
      include: { code: true, shiftAbsence: true },
      orderBy: { start: 'asc' },
    });

    return res.status(200).json(shifts);
  } catch (err) {
    return res.status(500).json({ error: 'Serverfehler' });
  }
}

async function handlePOST(req: NextApiRequest, res: NextApiResponse) {
  const { userId, codeId, start, end } = req.body;

  const created = await prisma.shift.create({
    data: {
      userId,
      codeId,
      start: new Date(start),
      end: new Date(end),
    },
    include: { code: true },
  });

  return res.status(201).json(created);
}
