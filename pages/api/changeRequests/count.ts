import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prismadb';
import { getCurrentUser, hasRole } from '@/lib/auth';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { ok, user, error } = await getCurrentUser(req);
  if (!ok) return res.status(401).json({ error });
  if (req.method === 'GET') {
    if (!hasRole(user, 'MANAGER'))
      return res.status(401).json({ error: 'Not Authorized' });
    await handleGET(req, res);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}

async function handleGET(req: NextApiRequest, res: NextApiResponse) {
  const count = await prisma.changeRequest.count({
    where: { status: 'PENDING' },
  });

  return res.status(201).json(count);
}
