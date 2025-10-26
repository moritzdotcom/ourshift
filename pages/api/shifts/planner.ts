import { Prisma } from '@/generated/prisma';
import prisma from '@/lib/prismadb';
import { buildShiftWhereQuery } from '@/lib/shift';
import { buildVacationDayWhereQuery } from '@/lib/vacationDay';
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

export type ApiGetShiftsPlannerResponse = Array<{
  id: string;
  userId: string;
  code: Prisma.ShiftCodeGetPayload<{}> | 'U';
  start: string;
  isSick: boolean;
}>;

async function handleGET(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { where: shiftWhere, error: shiftError } = buildShiftWhereQuery(
      req.query.from,
      req.query.to,
      'contained'
    );
    const { where: vacaWhere, error: vacaError } = buildVacationDayWhereQuery(
      req.query.from,
      req.query.to,
      'contained'
    );
    if (shiftError || vacaError)
      return res.status(400).json({ error: shiftError || vacaError });

    const shifts = await prisma.shift.findMany({
      where: shiftWhere,
      include: { code: true, shiftAbsence: true },
      orderBy: { start: 'asc' },
    });

    const vacationDays = await prisma.vacationDay.findMany({
      where: vacaWhere,
    });

    let response: ApiGetShiftsPlannerResponse = [];
    for (const s of shifts) {
      if (!s.code) continue;
      response.push({
        id: s.id,
        userId: s.userId,
        code: s.code,
        start: s.start.toISOString(),
        isSick: s.shiftAbsence?.status === 'APPROVED',
      });
    }

    for (const vaca of vacationDays) {
      response.push({
        id: vaca.id,
        userId: vaca.userId,
        code: 'U',
        start: vaca.date.toISOString(),
        isSick: false,
      });
    }

    return res.status(200).json(response);
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
