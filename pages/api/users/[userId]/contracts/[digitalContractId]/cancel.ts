// pages/api/users/[userId]/contracts/[digitalContractId]/cancel.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prismadb';
import { authGuard } from '@/lib/auth';

type CancelContractBody = {
  terminationDate?: unknown;
  deleteFutureShifts?: unknown;
};

function parseISODate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;

  // Erwartet bewusst ein Datum ohne Uhrzeit aus dem <input type="date" />.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) return null;

  // Verhindert, dass ungültige Daten wie 2026-02-31 stillschweigend
  // in einen anderen Monat umgewandelt werden.
  if (date.toISOString().slice(0, 10) !== value) return null;

  return date;
}

function getStartOfFollowingDay(date: Date) {
  const followingDay = new Date(date);
  followingDay.setUTCDate(followingDay.getUTCDate() + 1);
  return followingDay;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { ok, error } = await authGuard(req, 'MANAGER');

  if (!ok) {
    return res.status(401).json({ error });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Methode nicht erlaubt.',
    });
  }

  const userId = req.query.userId as string;
  const digitalContractId = req.query.digitalContractId as string;
  const body = req.body as CancelContractBody;

  if (!userId || !digitalContractId) {
    return res.status(400).json({
      error: 'userId oder digitalContractId fehlt.',
    });
  }

  const terminationDate = parseISODate(body.terminationDate);

  if (!terminationDate) {
    return res.status(400).json({
      error: 'Bitte ein gültiges Austrittsdatum angeben.',
    });
  }

  if (
    body.deleteFutureShifts !== undefined &&
    typeof body.deleteFutureShifts !== 'boolean'
  ) {
    return res.status(400).json({
      error: '"deleteFutureShifts" muss true oder false sein.',
    });
  }

  const deleteFutureShifts = body.deleteFutureShifts === true;

  try {
    const existingContract = await prisma.digitalContract.findUnique({
      where: {
        id: digitalContractId,
      },
    });

    if (!existingContract || existingContract.userId !== userId) {
      return res.status(404).json({
        error: 'Vertrag nicht gefunden.',
      });
    }

    if (terminationDate < existingContract.validFrom) {
      return res.status(400).json({
        error: 'Das Austrittsdatum darf nicht vor dem Vertragsbeginn liegen.',
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const contract = await tx.digitalContract.update({
        where: {
          id: digitalContractId,
        },
        data: {
          validUntil: terminationDate,
        },
      });

      const user = await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          terminationDate,
        },
        select: {
          terminationDate: true,
        },
      });

      let deletedShiftsCount = 0;

      if (deleteFutureShifts) {
        const deleteFrom = getStartOfFollowingDay(terminationDate);

        const deletedShifts = await tx.shift.deleteMany({
          where: {
            userId,
            start: {
              gte: deleteFrom,
            },
          },
        });

        deletedShiftsCount = deletedShifts.count;
      }

      return {
        contract,
        terminationDate: user.terminationDate,
        deletedShiftsCount,
      };
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Contract cancel error:', error);

    return res.status(500).json({
      error: 'Serverfehler beim Beenden des Arbeitsverhältnisses.',
    });
  }
}
