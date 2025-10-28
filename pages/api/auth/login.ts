import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prismadb';
import { setAuthCookie, signSession } from '@/lib/auth';
import { verifyPassword } from '@/lib/password';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') return res.status(405).end();

  const { identifier, password, remember } = req.body || {};
  if (!identifier || !password) {
    return res
      .status(400)
      .json({ error: 'Bitte E-Mail/Benutzername und Passwort angeben.' });
  }

  // User via email ODER employeeNumber/username finden
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: identifier.toLowerCase() },
        { employeeNumber: identifier.toLowerCase() },
      ],
    },
    include: { credentials: true },
  });

  if (!user || !user.credentials?.passwordHash) {
    return res.status(401).json({ error: 'Ungültige Zugangsdaten.' });
  }

  const ok = await verifyPassword(user.credentials.passwordHash, password);
  if (!ok) return res.status(401).json({ error: 'Ungültige Zugangsdaten.' });

  const token = await signSession(
    {
      sub: user.id,
      role: user.role as any,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email ?? null,
    },
    { expiresInSec: remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24 }
  );

  setAuthCookie(res, token, !!remember);
  return res.status(200).json({ ok: true });
}
