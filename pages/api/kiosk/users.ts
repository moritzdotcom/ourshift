import { Prisma } from '@/generated/prisma';
import { verifyPin } from '@/lib/password';
import prisma from '@/lib/prismadb';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    await handleGET(req, res);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}

export type ApiGetKioskUsersResponse = Prisma.UserGetPayload<{
  select: {
    id: true;
    firstName: true;
    lastName: true;
    kiosk: { select: { pinLength: true } };
  };
}>[];

async function handleGET(req: NextApiRequest, res: NextApiResponse) {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      kiosk: { select: { pinLength: true } },
    },
  });
  return res.status(200).json(users);
}
