import { authGuard } from '@/lib/auth';
import { hashPassword, hashPin } from '@/lib/password';
import prisma from '@/lib/prismadb';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { ok, error } = await authGuard(req, 'MANAGER');
  if (!ok) return res.status(401).json({ error });

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

  if (typeof password === 'string') {
    const { ok, hash: passwordHash, error } = await hashPassword(password);
    if (!ok) return res.status(400).json({ error });

    await prisma.userCredential.upsert({
      where: { userId: id },
      update: { passwordHash },
      create: { userId: id, passwordHash },
    });
  }

  if (typeof pin === 'string') {
    const { ok, hash: pinHash, error } = await hashPin(pin);
    if (!ok) return res.status(400).json({ error });

    const pinLength = pin.length;
    await prisma.kioskCredential.upsert({
      where: { userId: id },
      update: { pinHash, pinLength },
      create: { userId: id, pinHash, pinLength },
    });
  }

  return res.status(200).json({ message: 'Credentials Set' });
}
