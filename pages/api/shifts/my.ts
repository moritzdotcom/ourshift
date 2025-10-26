import type { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUserId } from '@/lib/auth';
import prisma from '@/lib/prismadb';
import { buildShiftWhereQuery } from '@/lib/shift';
import { Prisma } from '@/generated/prisma';
import { buildVacationDayWhereQuery } from '@/lib/vacationDay';

export type ApiMyShiftResponse = {
  shifts: Prisma.ShiftGetPayload<{
    include: {
      code: {
        select: { code: true; label: true; color: true; isWorkingShift: true };
      };
      changeRequest: {
        omit: {
          createdAt: true;
          shiftId: true;
          userId: true;
          updatedAt: true;
        };
      };
      shiftAbsence: {
        select: { id: true; reason: true };
      };
    };
  }>[];
  vacationDays: Prisma.VacationDayGetPayload<{}>[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { ok, userId, error } = await getCurrentUserId(req);
    if (!ok) return res.status(401).json({ error });
    const { where: shiftWhere, error: shiftError } = buildShiftWhereQuery(
      req.query.from,
      req.query.to,
      'overlap'
    );
    const { where: vacWhere, error: vacError } = buildVacationDayWhereQuery(
      req.query.from,
      req.query.to,
      'overlap'
    );
    if (shiftError || vacError)
      return res.status(400).json({ error: shiftError || vacError });

    const shifts = await prisma.shift.findMany({
      where: { userId, ...shiftWhere },
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

    const vacationDays = await prisma.vacationDay.findMany({
      where: {
        userId,
        ...vacWhere,
      },
    });
    return res.status(200).json({ shifts, vacationDays });
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
