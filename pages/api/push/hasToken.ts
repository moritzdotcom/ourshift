import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prismadb';
import { getCurrentUserId } from '@/lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { ok, userId } = await getCurrentUserId(req);
  if (!ok) return res.status(401).json({ ok: false });

  const [pref, token] = await Promise.all([
    prisma.notificationPreference.findUnique({ where: { userId } }),
    prisma.pushToken.findFirst({ where: { userId } }),
  ]);

  res.json({
    ok: true,
    hasToken: Boolean(token),
    pushEnabled: pref?.pushEnabled ?? true,
    permission:
      typeof Notification !== 'undefined' ? Notification.permission : undefined,
  });
}
