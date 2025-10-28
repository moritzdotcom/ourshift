import { hashPassword, hashPin } from '@/lib/password';
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
  if (req.method === 'PUT') {
    await handlePUT(req, res, userId);
  } else if (req.method === 'DELETE') {
    await handleDELETE(req, res, userId);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}

async function handlePUT(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string
) {
  const {
    firstName,
    lastName,
    employeeNumber,
    email,
    phone,
    role,
    isActive,
    employmentStart,
    terminationDate,
    password,
    kioskPin,
  } = req.body;

  const updated = await prisma.user.update({
    where: { id },
    data: {
      firstName,
      lastName,
      employeeNumber,
      email,
      phone,
      role,
      isActive,
      employmentStart: employmentStart ? new Date(employmentStart) : null,
      terminationDate: terminationDate ? new Date(terminationDate) : null,
    },
  });

  if (typeof password === 'string') {
    const passwordHash = await hashPassword(password);
    await prisma.userCredential.upsert({
      where: { userId: id },
      update: { passwordHash },
      create: { userId: id, passwordHash },
    });
  }

  if (typeof kioskPin === 'string') {
    const pinHash = await hashPin(kioskPin);
    const pinLength = kioskPin.length;
    await prisma.kioskCredential.upsert({
      where: { userId: id },
      update: { pinHash, pinLength },
      create: { userId: id, pinHash, pinLength },
    });
  }

  return res.status(200).json(updated);
}

async function handleDELETE(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string
) {
  await prisma.user.delete({
    where: { id },
  });
  return res.status(204).end();
}
