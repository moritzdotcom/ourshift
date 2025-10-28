import { Prisma } from '@/generated/prisma';
import { authGuard } from '@/lib/auth';
import prisma from '@/lib/prismadb';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { ok, error } = await authGuard(req, 'MANAGER');
  if (!ok) return res.status(401).json({ error });

  if (req.method === 'POST') {
    await handlePOST(req, res);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}

export type ApiBulkShiftsRequestBody = Array<{
  userId: string;
  start: string;
  end: string;
  codeId: string | null;
  existingId: string | undefined;
  state: 'new' | 'updated' | 'deleted' | 'unchanged';
  isSick: boolean;
  vacation: boolean;
}>;

async function handlePOST(req: NextApiRequest, res: NextApiResponse) {
  const data = req.body as ApiBulkShiftsRequestBody;
  if (!Array.isArray(data)) {
    return res.status(400).json({ error: 'Request body must be an array' });
  }

  // CREATE: shifts that are marked as new
  const toCreate = data.filter((s) => s.state === 'new' && !s.vacation);

  // UPDATE: shifts that are marked as updated and not converted to vacation days
  const toUpdate = data.filter((s) => s.state === 'updated' && !s.vacation);

  // DELETE: shifts that are marked as deleted or converted to vacation days
  const toDelete = data.filter(
    (s) =>
      (s.existingId && s.state === 'deleted' && !s.vacation) ||
      (s.state === 'updated' && s.existingId && s.vacation)
  );

  // CREATE new vacation days and vacation days for shifts converted to vacation
  const newVacationDays = data.filter(
    (s) =>
      s.vacation &&
      (s.state === 'new' || (s.state === 'updated' && s.existingId))
  );

  // DELETE vacation days
  const toDeleteVacationDays = data.filter(
    (s) => s.vacation && s.existingId && s.state === 'deleted'
  );

  const response = {
    created: toCreate.length,
    updated: toUpdate.length,
    deleted: toDelete.length,
    vacationDaysCreated: newVacationDays.length,
  };

  function shiftAbsenceHelper(
    shift: ApiBulkShiftsRequestBody[number]
  ): Pick<Prisma.ShiftUpdateInput, 'shiftAbsence'> {
    if (shift.isSick) {
      return {
        shiftAbsence: {
          upsert: {
            create: {
              reason: 'SICKNESS',
              status: 'APPROVED',
              userId: shift.userId,
            },
            update: { reason: 'SICKNESS', status: 'APPROVED' },
          },
        },
      };
    } else {
      return { shiftAbsence: { delete: true } };
    }
  }

  if (toUpdate.length > 0) {
    await prisma.$transaction(
      toUpdate.map((shift) => {
        return prisma.shift.update({
          where: { id: shift.existingId },
          data: {
            userId: shift.userId,
            codeId: shift.codeId,
            start: new Date(shift.start),
            end: new Date(shift.end),
            ...shiftAbsenceHelper(shift),
          },
        });
      })
    );
  }

  if (toDelete.length > 0) {
    await prisma.shift.deleteMany({
      where: {
        id: {
          in: toDelete
            .map((s) => s.existingId)
            .filter((id): id is string => !!id),
        },
      },
    });
  }

  if (toDeleteVacationDays.length > 0) {
    await prisma.vacationDay.deleteMany({
      where: {
        id: {
          in: toDeleteVacationDays
            .map((s) => s.existingId)
            .filter((id): id is string => !!id),
        },
      },
    });
  }

  if (newVacationDays.length > 0) {
    await prisma.vacationDay.createMany({
      data: newVacationDays.map((d) => ({
        userId: d.userId,
        date: new Date(d.start),
      })),
    });
  }

  if (toCreate.length > 0) {
    const sick = toCreate.filter((s) => s.isSick);
    const healthy = toCreate.filter((s) => !s.isSick);

    await prisma.$transaction(async (tx) => {
      // 1) Healthy Shifts: createMany (ohne unerlaubte Keys!)
      if (healthy.length > 0) {
        await tx.shift.createMany({
          data: healthy.map((s) => ({
            userId: s.userId,
            codeId: s.codeId ?? null,
            start: new Date(s.start),
            end: new Date(s.end),
          })),
          // skipDuplicates: true, // optional falls du Unique-Constraints hast
        });
      }

      // 2) Sick Shifts: einzelnes create mit nested shiftAbsence
      for (const s of sick) {
        await tx.shift.create({
          data: {
            userId: s.userId,
            codeId: s.codeId ?? null,
            start: new Date(s.start),
            end: new Date(s.end),
            shiftAbsence: {
              create: {
                reason: 'SICKNESS',
                status: 'APPROVED',
                userId: s.userId, // nur falls im Schema erforderlich
              },
            },
          },
        });
      }
    });
  }

  return res.status(201).json(response);
}
