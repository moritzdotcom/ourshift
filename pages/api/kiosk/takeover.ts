import { Prisma } from '@/generated/prisma';
import { verifyPin } from '@/lib/password';
import prisma from '@/lib/prismadb';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    await handlePOST(req, res);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}

export type ApiPostKioskTakeoverResponse = {
  validPin: boolean | null;
  shift?: {
    id: string;
    clockIn: Date | null;
    clockOut: Date | null;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      kiosk: {
        pinLength: number;
      } | null;
    };
  };
  error?: string;
};

async function handlePOST(req: NextApiRequest, res: NextApiResponse) {
  const { shiftId, userId, pin } = req.body;

  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    select: {
      id: true,
      clockIn: true,
      clockOut: true,
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { kiosk: true },
  });

  if (!shift) {
    return res.status(404).json({
      validPin: null,
      shift: undefined,
      error: 'Schicht nicht gefunden',
    });
  }
  if (!user) {
    return res.status(404).json({
      validPin: null,
      shift: undefined,
      error: 'Benutzer nicht gefunden',
    });
  }
  if (!user.kiosk?.pinHash) {
    return res.status(400).json({ validPin: null, error: 'PIN nicht gesetzt' });
  }

  const isPinValid = await verifyPin(user.kiosk.pinHash, pin);
  if (!isPinValid) {
    return res.status(401).json({ validPin: false, error: 'Ungültige PIN' });
  }

  // Punch-Typ ermitteln
  let updatedShift;
  if (shift.clockIn && !shift.clockOut) {
    // ausstempeln
    updatedShift = await prisma.shift.update({
      where: { id: shiftId },
      data: {
        userId,
        clockOut: new Date(),
        clockOutSource: 'KIOSK',
      },
      select: {
        id: true,
        clockIn: true,
        clockOut: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            kiosk: { select: { pinLength: true } },
          },
        },
      },
    });
  } else if (!shift.clockIn) {
    // einstempeln
    updatedShift = await prisma.shift.update({
      where: { id: shiftId },
      data: {
        userId,
        clockIn: new Date(),
        clockInSource: 'KIOSK',
      },
      select: {
        id: true,
        clockIn: true,
        clockOut: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            kiosk: { select: { pinLength: true } },
          },
        },
      },
    });
  } else {
    return res
      .status(400)
      .json({ validPin: true, error: 'Schicht bereits komplett gestempelt' });
  }

  return res.status(201).json({ validPin: true, shift: updatedShift });
}
