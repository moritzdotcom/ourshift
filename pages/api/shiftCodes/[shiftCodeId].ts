import prisma from '@/lib/prismadb';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { shiftCodeId } = req.query;
  if (typeof shiftCodeId !== 'string') {
    return res.status(400).json({ error: 'Invalid shiftCodeId' });
  }
  if (req.method === 'PUT') {
    await handlePUT(req, res, shiftCodeId);
  } else if (req.method === 'DELETE') {
    await handleDELETE(req, res, shiftCodeId);
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
    code,
    label,
    color,
    description,
    windowStartMin,
    windowEndMin,
    sortOrder,
    isWorkingShift,
  } = req.body;

  const updated = await prisma.shiftCode.update({
    where: { id },
    data: {
      code,
      label,
      color,
      description,
      windowStartMin,
      windowEndMin,
      sortOrder,
      isWorkingShift,
    },
  });

  return res.status(200).json(updated);
}

async function handleDELETE(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string
) {
  await prisma.shiftCode.delete({
    where: { id },
  });
  return res.status(204).end();
}
