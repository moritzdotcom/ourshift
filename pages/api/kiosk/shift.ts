import { Prisma } from '@/generated/prisma';
import { verifyPin } from '@/lib/password';
import prisma from '@/lib/prismadb';
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

export type ApiGetKioskShiftResponse = Prisma.ShiftGetPayload<{
  select: {
    user: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        kiosk: { select: { pinLength: true } };
      };
    };
    code: true;
    start: true;
    end: true;
    id: true;
    clockIn: true;
    clockOut: true;
  };
}>[];

async function handleGET(req: NextApiRequest, res: NextApiResponse) {
  const gracePeriod = 60_000 * 120; // 120 Minuten
  const nowWithGP = new Date(new Date().getTime() - gracePeriod);

  // 1) laufende/aktive Schichten:
  // clockIn != null && clockOut == null
  // keine Abwesenheit
  const activeShifts = await prisma.shift.findMany({
    where: {
      clockIn: { not: null },
      clockOut: null,
      shiftAbsence: null,
      end: { gte: nowWithGP }, // safety: nicht komplett abgelaufene Zombies
    },
    orderBy: {
      clockIn: 'asc', // älteste zuerst (die läuft am längsten)
    },
    select: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          kiosk: { select: { pinLength: true } },
        },
      },
      code: true,
      start: true,
      end: true,
      id: true,
      clockIn: true,
      clockOut: true,
    },
  });

  // 2) nächste Schicht, die noch ansteht oder gerade läuft:
  // Ende >= jetzt, keine Abwesenheit
  // Wir nehmen die NÄCHSTE nach Startzeit.
  const upcomingShifts = await prisma.shift.findMany({
    where: {
      start: { gte: nowWithGP },
      shiftAbsence: null,
    },
    orderBy: {
      start: 'asc',
    },
    take: 2,
    select: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          kiosk: { select: { pinLength: true } },
        },
      },
      code: true,
      start: true,
      end: true,
      id: true,
      clockIn: true,
      clockOut: true,
    },
  });

  // jetzt mergen:
  // - aktive zuerst
  // - dann upcoming, falls nicht schon drin
  const list: any[] = [...activeShifts];
  list.push(
    ...upcomingShifts.filter(
      (us) => !list.find((s) => s.id === us.id) && us.clockOut === null
    )
  );

  return res.json(list);
}

export type ApiPostKioskShiftResponse = {
  validPin: boolean | null;
  shift?: {
    id: string;
    clockIn: Date | null;
    clockOut: Date | null;
  };
  error?: string;
};

async function handlePOST(req: NextApiRequest, res: NextApiResponse) {
  const { shiftId, pin } = req.body;

  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    select: {
      id: true,
      user: {
        select: {
          kiosk: true,
        },
      },
      clockIn: true,
      clockOut: true,
    },
  });

  if (!shift) {
    return res.status(404).json({
      validPin: null,
      shift: undefined,
      error: 'Schicht nicht gefunden',
    });
  }
  if (!shift.user.kiosk?.pinHash) {
    return res.status(400).json({ validPin: null, error: 'PIN nicht gesetzt' });
  }

  const isPinValid = await verifyPin(shift.user.kiosk.pinHash, pin);
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
        clockOut: new Date(),
        clockOutSource: 'KIOSK',
      },
      select: {
        id: true,
        clockIn: true,
        clockOut: true,
      },
    });
  } else if (!shift.clockIn) {
    // einstempeln
    updatedShift = await prisma.shift.update({
      where: { id: shiftId },
      data: {
        clockIn: new Date(),
        clockInSource: 'KIOSK',
      },
      select: {
        id: true,
        clockIn: true,
        clockOut: true,
      },
    });
  } else {
    return res
      .status(400)
      .json({ validPin: true, error: 'Schicht bereits komplett gestempelt' });
  }

  return res.status(201).json({ validPin: true, shift: updatedShift });
}
