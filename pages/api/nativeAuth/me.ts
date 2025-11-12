// pages/api/nativeAuth/me.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prismadb';
import { verifySession } from '@/lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer '))
    return res.status(401).json({ message: 'No token' });
  const token = auth.split(' ')[1];
  const payload = await verifySession(token);
  if (!payload) return res.status(401).json({ message: 'Invalid token' });

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) return res.status(404).end();
  const safeUser = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  };
  return res.status(200).json(safeUser);
}
