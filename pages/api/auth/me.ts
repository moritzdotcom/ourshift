import type { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prismadb';
import { Role } from '@/generated/prisma';

export type ApiGetCurrentUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  role: Role;
  isActive: boolean;
};

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { ok, user, error } = await getCurrentUser(req);
  if (!ok) return res.status(401).json({ error });

  if (req.method === 'GET') {
    return res.status(200).json(user);
  } else if (req.method === 'PUT') {
    const { firstName, lastName, email, isActive } = req.body;
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { firstName, lastName, email, isActive },
    });
    return res.status(200).json(updatedUser);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}
