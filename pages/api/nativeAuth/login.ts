// pages/api/nativeAuth/login.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prismadb';
import { hashToken, verifyPassword } from '@/lib/password';
import { signSession } from '@/lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({
    where: { email },
    include: { credentials: true },
  });

  if (!user || !user.credentials?.passwordHash) {
    return res.status(401).json({ error: 'Ungültige Zugangsdaten.' });
  }
  if (
    !user ||
    !(await verifyPassword(user.credentials?.passwordHash, password))
  ) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const accessToken = await signSession(
    { sub: user.id, type: 'access' },
    { expiresInSec: 60 * 60 }
  );
  const refreshToken = await signSession(
    { sub: user.id, type: 'refresh' },
    { expiresInSec: 60 * 60 * 24 * 30 }
  );

  // Store hashed refresh token
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: await hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const safeUser = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
  };
  return res.status(200).json({ accessToken, refreshToken, user: safeUser });
}
