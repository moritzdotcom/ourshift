import prisma from '@/lib/prismadb';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    await handleGET(req, res);
  } else if (req.method === 'POST') {
    await handlePOST(req, res);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}

async function handleGET(req: NextApiRequest, res: NextApiResponse) {
  const shiftCodes = await prisma.shiftCode.findMany({
    orderBy: { sortOrder: 'asc' },
    where: { archived: false },
  });
  return res.json(shiftCodes);
}

async function handlePOST(req: NextApiRequest, res: NextApiResponse) {
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

  const created = await prisma.shiftCode.create({
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

  return res.status(201).json(created);
}
