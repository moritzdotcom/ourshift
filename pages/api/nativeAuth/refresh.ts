// pages/api/nativeAuth/refresh.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prismadb';
import { signSession, verifySession } from '@/lib/auth';
import { compareTokenHash, hashToken } from '@/lib/password';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') return res.status(405).end();
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(400).json({ message: 'No refresh token' });

  const payload = await verifySession(refreshToken);
  if (!payload || payload.type !== 'refresh')
    return res.status(401).json({ message: 'Invalid refresh token' });

  // find hashed token in DB
  const tokens = await prisma.refreshToken.findMany({
    where: { userId: payload.sub, revoked: false },
  });
  const found = await Promise.all(
    tokens.map(async (t) => ({
      t,
      match: await compareTokenHash(refreshToken, t.tokenHash),
    }))
  );
  const match = found.find((x) => x.match);
  if (!match)
    return res.status(401).json({ message: 'Refresh token not found' });

  // rotate: revoke old token, create new
  await prisma.refreshToken.update({
    where: { id: match.t.id },
    data: { revoked: true },
  });

  const newAccess = await signSession(
    { sub: payload.sub },
    { expiresInSec: 60 * 60 }
  );
  const newRefresh = await signSession(
    { sub: payload.sub, type: 'refresh' },
    { expiresInSec: 60 * 60 * 24 * 30 }
  );

  await prisma.refreshToken.create({
    data: {
      userId: payload.sub,
      tokenHash: await hashToken(newRefresh),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return res
    .status(200)
    .json({ accessToken: newAccess, refreshToken: newRefresh });
}
