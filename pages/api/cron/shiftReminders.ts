import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prismadb';
import { sendPushToUser } from '@/lib/push';

// Konfigurierbar, passend zum Cron-Intervall:
const CRON_INTERVAL_MIN = 5;

// Pre-Reminder: 10 Minuten vor Start, aber Fenster ±(CRON_INTERVAL_MIN/2)
const PRE_TARGET_MIN = 10;
const PRE_DELTA_MIN = Math.ceil(CRON_INTERVAL_MIN / 2); // z.B. 3

// Post-Reminder: bis zu CRON_INTERVAL_MIN Minuten nach Start
const POST_WINDOW_MIN = CRON_INTERVAL_MIN; // z.B. 5

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end('Unauthorized');
  }

  const now = new Date();
  const plus = (min: number) => new Date(now.getTime() + min * 60_000);
  const minus = (min: number) => new Date(now.getTime() - min * 60_000);

  // Pre: [10 - Δ, 10 + Δ] Minuten in der Zukunft
  const preFrom = plus(PRE_TARGET_MIN - PRE_DELTA_MIN); // now+7m
  const preTo = plus(PRE_TARGET_MIN + PRE_DELTA_MIN); // now+13m

  // Post: [now - POST_WINDOW_MIN, now]
  const postFrom = minus(POST_WINDOW_MIN); // now-5m
  const postTo = now;

  // --- PRE REMINDER ---
  const preCandidates = await prisma.shift.findMany({
    where: {
      start: { gte: preFrom, lte: preTo },
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
    const sent = await prisma.shiftNotifyLog.findUnique({
      where: {
        userId_shiftId_kind: {
          userId: s.userId,
          shiftId: s.id,
          kind: 'preStart',
        },
      },
    });
    if (sent) continue;

    const startLabel = new Date(s.start).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });
    await sendPushToUser(s.userId, {
      title: 'Deine Schicht startet bald',
      body: `${
        s.code?.label || 'Schicht'
      } • ${startLabel} - bitte einstempeln.`,
      link: '/',
      tag: `shift-${s.id}`,
    });

    await prisma.shiftNotifyLog.create({
      data: { userId: s.userId, shiftId: s.id, kind: 'preStart' },
    });
  }

  // --- POST REMINDER ---
  const postCandidates = await prisma.shift.findMany({
    where: {
      start: { gte: postFrom, lte: postTo },
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
    const sent = await prisma.shiftNotifyLog.findUnique({
      where: {
        userId_shiftId_kind: {
          userId: s.userId,
          shiftId: s.id,
          kind: 'postStart',
        },
      },
    });
    if (sent) continue;

    await sendPushToUser(s.userId, {
      title: 'Schicht hat begonnen',
      body: 'Bitte jetzt einstempeln.',
      link: '/',
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
