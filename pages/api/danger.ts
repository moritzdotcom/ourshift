import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prismadb';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const shifts = await prisma.shift.findMany({
    where: { clockInSource: 'MANUAL' },
  });

  const other = await prisma.shift.findMany({
    where: { clockInSource: null },
  });

  const updated = await prisma.$transaction(
    shifts.map((s) =>
      prisma.shift.update({
        where: { id: s.id },
        data: {
          clockIn: s.start,
          clockInSource: 'MANUAL',
          clockOut: s.end,
          clockOutSource: 'MANUAL',
        },
      })
    )
  );

  const oUpdated = await prisma.$transaction(
    shifts.map((s) =>
      prisma.shift.update({
        where: { id: s.id },
        data: {
          clockIn: null,
          clockOut: null,
        },
      })
    )
  );
  return res.status(200).json(updated);
}
