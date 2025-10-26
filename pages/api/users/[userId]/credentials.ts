import { hashPassword } from '@/lib/password';
import prisma from '@/lib/prismadb';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { userId } = req.query;
  if (typeof userId !== 'string') {
    return res.status(400).json({ error: 'Invalid userId' });
  }
  if (req.method === 'POST') {
    await handlePOST(req, res, userId);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}

async function handlePOST(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string
) {
  const { password, pin } = req.body;

  if (password) {
    const passwordHash = await hashPassword(password);
    await prisma.userCredential.upsert({
      where: { userId: id },
      update: { passwordHash },
      create: { userId: id, passwordHash },
    });
  }

  if (pin) {
    const pinHash = await hashPassword(pin);
    await prisma.kioskCredential.upsert({
      where: { userId: id },
      update: { pinHash },
      create: { userId: id, pinHash },
    });
  }

  return res.status(200).json({ message: 'Credentials Set' });
}
