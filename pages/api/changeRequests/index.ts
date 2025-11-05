import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prismadb';
import { getCurrentUser, hasRole } from '@/lib/auth';
import { Prisma } from '@/generated/prisma';
import { isValidStatus } from '@/lib/changeRequest';
import { trySendPushToAdmins } from '@/lib/push';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { ok, user, error } = await getCurrentUser(req);
  if (!ok) return res.status(401).json({ error });

  if (req.method === 'GET') {
    if (!hasRole(user, 'MANAGER'))
      return res.status(401).json({ error: 'Not Authorized' });
    await handleGET(req, res);
  } else if (req.method === 'POST') {
    await handlePOST(req, res, user.id);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}

export type ApiGetChangeRequestResponse = Prisma.ChangeRequestGetPayload<{
  include: {
    user: { select: { firstName: true; lastName: true } };
    shift: { include: { code: true } };
  };
}>;

async function handleGET(req: NextApiRequest, res: NextApiResponse) {
  const { status } = req.query;
  const statusParam = isValidStatus(status) ? status : undefined;
  const cr = await prisma.changeRequest.findMany({
    where: { status: statusParam },
    include: {
      user: { select: { firstName: true, lastName: true } },
      shift: { include: { code: true } },
    },
  });

  return res.status(201).json(cr);
}

export type ApiPostChangeRequestResponse = Prisma.ChangeRequestGetPayload<{}>;

async function handlePOST(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  const { shiftId, clockIn, clockOut } = req.body ?? {};

  if (!shiftId || typeof shiftId !== 'string') {
    return res.status(400).json({ error: 'shiftId ist erforderlich.' });
  }
  if (
    !clockIn ||
    !clockOut ||
    typeof clockIn !== 'string' ||
    typeof clockOut !== 'string'
  ) {
    return res
      .status(400)
      .json({ error: 'clockIn und clockOut sind erforderlich.' });
  }

  const clockInDate = new Date(clockIn);
  const clockOutDate = new Date(clockOut);
  if (
    Number.isNaN(clockInDate.getTime()) ||
    Number.isNaN(clockOutDate.getTime())
  ) {
    return res.status(400).json({ error: 'Ungültiges Datumsformat.' });
  }
  if (clockInDate >= clockOutDate) {
    return res.status(400).json({ error: 'clockIn muss vor clockOut liegen.' });
  }

  // Shift prüfen (existiert & Policy)
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: { changeRequest: { select: { id: true } } },
  });
  if (!shift) return res.status(404).json({ error: 'Shift nicht gefunden.' });

  if (shift.userId !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const changeRequestId = shift.changeRequest?.id;

  if (changeRequestId) {
    const cr = await prisma.changeRequest.update({
      where: { id: changeRequestId },
      data: {
        clockIn: clockInDate,
        clockOut: clockOutDate,
        status: 'PENDING',
      },
    });

    return res.status(201).json(cr);
  } else {
    const cr = await prisma.changeRequest.create({
      data: {
        userId,
        shiftId: shift.id,
        clockIn: clockInDate,
        clockOut: clockOutDate,
      },
      include: { user: { select: { firstName: true } } },
    });

    await trySendPushToAdmins(
      {
        title: 'Änderungs Anfrage',
        body: `Neue Anfrage von ${cr.user.firstName}.`,
        link: `/management/requests`,
        tag: `newChangeRequest-${cr.id}`,
      },
      cr.userId,
      cr.shiftId,
      'newChangeRequest',
      'MANAGER'
    );

    return res.status(201).json(cr);
  }
}
