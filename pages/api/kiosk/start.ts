import { hashPin } from '@/lib/password';
import { serialize } from 'cookie';
import { NextApiRequest, NextApiResponse } from 'next';

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

  const pinHash = await hashPin(pin);

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
