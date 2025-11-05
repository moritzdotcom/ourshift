import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prismadb';
import { getCurrentUserId } from '@/lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { ok, userId } = await getCurrentUserId(req);
  if (!ok) return res.status(401).end();

  if (req.method === 'GET') {
    const pref = await prisma.notificationPreference.findUnique({
      where: { userId },
    });
    return res.json({ pushEnabled: pref?.pushEnabled ?? true });
  }

  if (req.method === 'POST') {
    const { pushEnabled } = req.body as { pushEnabled: boolean };
    await prisma.notificationPreference.upsert({
      where: { userId },
      update: { pushEnabled },
      create: { userId, pushEnabled },
    });
    return res.json({ ok: true });
  }

  res.status(405).end();
}
