import { getCurrentUserId } from '@/lib/auth';
import { hashPassword, hashPin, verifyPassword } from '@/lib/password';
import prisma from '@/lib/prismadb';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'PUT') {
    await handlePUT(req, res);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}

async function handlePUT(req: NextApiRequest, res: NextApiResponse) {
  const { currentPassword, newPassword, newPin } = req.body;
  const { ok, userId, error } = await getCurrentUserId(req);
  if (!ok) return res.status(401).json({ error });

  if (newPassword) {
    const credentials = await prisma.userCredential.findUnique({
      where: { userId },
    });
    if (!credentials) return res.status(404).json({ error: 'User not found' });

    if (credentials.passwordHash) {
      const isCurrentPasswordValid = await verifyPassword(
        credentials.passwordHash,
        currentPassword
      );
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
    } else {
      return res
        .status(400)
        .json({ error: 'No password set for this user account' });
    }

    const {
      ok,
      hash: newPasswordHash,
      error,
    } = await hashPassword(newPassword);
    if (!ok) return res.status(400).json({ error });
    await prisma.userCredential.update({
      where: { userId },
      data: { passwordHash: newPasswordHash },
    });
  }

  if (typeof newPin === 'string') {
    const { ok, hash: newPinHash, error } = await hashPin(newPin);
    if (!ok) return res.status(400).json({ error });
    const pinLength = newPin.length;

    await prisma.kioskCredential.upsert({
      where: { userId },
      create: { userId, pinHash: newPinHash, pinLength },
      update: { pinHash: newPinHash, pinLength },
    });
  }

  return res.status(200).json({ ok: true });
}
