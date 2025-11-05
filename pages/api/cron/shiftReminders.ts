import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prismadb';
import { sendPushToUser } from '@/lib/push';

// Für Vercel Cron als GET
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const now = new Date();

  // Helper: Fenster
  const minFromNow = (min: number) => new Date(now.getTime() + min * 60_000);

  const preStartFrom = minFromNow(9);
  const preStartTo = minFromNow(10);

  const postStartFrom = minFromNow(1);
  const postStartTo = minFromNow(2);

  // Vor-Reminder: Schichten die gleich starten & noch nicht eingestempelt und noch nicht benachrichtigt
  const preCandidates = await prisma.shift.findMany({
    where: {
      start: { gte: preStartFrom, lte: preStartTo },
      clockIn: null,
      shiftAbsence: null,
    },
    select: {
      id: true,
      userId: true,
      start: true,
      code: { select: { label: true } },
    },
  });

  for (const s of preCandidates) {
    const already = await prisma.shiftNotifyLog.findUnique({
      where: {
        userId_shiftId_kind: {
          userId: s.userId,
          shiftId: s.id,
          kind: 'preStart',
        },
      },
    });
    if (already) continue;

    const startLabel = new Date(s.start).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });
    await sendPushToUser(s.userId, {
      title: 'Deine Schicht startet bald',
      body: `${
        s.code?.label || 'Schicht'
      } • ${startLabel} - bitte einstempeln.`,
      link: `/kiosk?shift=${s.id}`,
      tag: `shift-${s.id}`,
    });

    await prisma.shiftNotifyLog.create({
      data: { userId: s.userId, shiftId: s.id, kind: 'preStart' },
    });
  }

  // Nach-Reminder: gerade gestartet, noch kein clockIn, noch nicht post-reminded
  const postCandidates = await prisma.shift.findMany({
    where: {
      start: { gte: postStartFrom, lte: postStartTo },
      clockIn: null,
      shiftAbsence: null,
    },
    select: {
      id: true,
      userId: true,
      start: true,
      code: { select: { label: true } },
    },
  });

  for (const s of postCandidates) {
    const already = await prisma.shiftNotifyLog.findUnique({
      where: {
        userId_shiftId_kind: {
          userId: s.userId,
          shiftId: s.id,
          kind: 'postStart',
        },
      },
    });
    if (already) continue;

    await sendPushToUser(s.userId, {
      title: 'Schicht hat begonnen',
      body: `Bitte jetzt einstempeln.`,
      link: `/kiosk?shift=${s.id}`,
      tag: `shift-${s.id}`,
    });

    await prisma.shiftNotifyLog.create({
      data: { userId: s.userId, shiftId: s.id, kind: 'postStart' },
    });
  }

  res.json({
    ok: true,
    pre: preCandidates.length,
    post: postCandidates.length,
  });
}
