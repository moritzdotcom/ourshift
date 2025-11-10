import { verifyPin } from '@/lib/password';
import { serialize } from 'cookie';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') return res.status(405).end();

  const { pinAttempt } = req.body;

  const pinHash = req.cookies.kiosk_unlock_hash;
  const backupSession = req.cookies.os_session_backup;
  if (!pinHash || !backupSession)
    return res
      .status(200)
      .json({ ok: true, redirectTo: '/management/dashboard' });

  // compare
  const isValid = await verifyPin(pinHash, pinAttempt);
  if (!isValid) {
    return res.status(401).json({ ok: false, error: 'Falsche PIN' });
  }

  // restore original session, clear kiosk cookies
  res.setHeader('Set-Cookie', [
    serialize('os_session', backupSession, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
    }),
    serialize('os_session_backup', '', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      maxAge: 0,
    }),
    serialize('kiosk_unlock_hash', '', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      maxAge: 0,
    }),
    serialize('kiosk_mode', '', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      maxAge: 0,
    }),
  ]);

  return res
    .status(200)
    .json({ ok: true, redirectTo: '/management/dashboard' });
}
