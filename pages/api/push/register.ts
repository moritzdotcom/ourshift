import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prismadb';
import { getCurrentUserId } from '@/lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') return res.status(405).end();

  const { ok, userId } = await getCurrentUserId(req);
  if (!ok) return res.status(401).json({ error: 'unauthorized' });

  const { token, platform, ua } = req.body as {
    token: string;
    platform?: string;
    ua?: string;
  };
  if (!token) return res.status(400).json({ error: 'token required' });

  // Upsert (falls Token bereits existiert, nur lastSeen aktualisieren)
  await prisma.pushToken.upsert({
    where: { token },
    update: {
      userId,
      platform: platform || 'web',
      ua,
      lastSeen: new Date(),
    },
    create: { token, userId, platform: platform || 'web', ua },
  });

  // default pref anlegen, falls nicht vorhanden
  await prisma.notificationPreference.upsert({
    where: { userId },
    update: {},
    create: { userId, pushEnabled: true },
  });

  res.json({ ok: true });
}
