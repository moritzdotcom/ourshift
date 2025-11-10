import { getCurrentUserId } from '@/lib/auth';
import { hashPin } from '@/lib/password';
import { serialize } from 'cookie';
import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prismadb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') return res.status(405).end();

  const { pin } = req.body;
  if (!pin || pin.length < 4 || pin.length > 6) {
    return res.status(400).json({ error: 'Ungültige PIN' });
  }

  const currentSession = req.cookies.os_session;
  if (!currentSession)
    return res.status(401).json({ error: 'Not Authenticated' });

  const { ok: pinOk, hash: pinHash, error: pinError } = await hashPin(pin);
  if (!pinOk) return res.status(400).json({ error: pinError });

  const { ok, userId, error } = await getCurrentUserId(req);
  if (!ok) return res.status(400).json({ error });

  const userCredential = await prisma.userCredential.findFirst({
    where: { userId },
    select: { passwordHash: true },
  });
  if (!userCredential)
    return res.status(400).json({ error: 'No Password Set' });

  // 5. setze Cookies
  res.setHeader('Set-Cookie', [
    serialize('os_session_backup', currentSession, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
    }),
    serialize('kiosk_unlock_hash', pinHash, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
    }),
    serialize('kiosk_unlock_password_hash', userCredential.passwordHash, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
    }),
    serialize('kiosk_mode', '1', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
    }),
    serialize('os_session', '', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
    }),
  ]);

  return res.status(200).json({ ok: true });
}
