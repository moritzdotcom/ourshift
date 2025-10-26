import type { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { Role } from '@/generated/prisma';

export type ApiGetCurrentUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  role: Role;
  isActive: boolean;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { ok, user, error } = await getCurrentUser(req);
    if (!ok) return res.status(401).json({ error });
    return res.status(200).json(user);
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
