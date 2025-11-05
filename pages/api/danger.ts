import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prismadb';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const shifts = await prisma.shift.findMany({
    where: { code: { code: 'ND' }, start: { gte: new Date(2025, 10, 1) } },
  });

  const updated = await prisma.$transaction(
    shifts.map((s) =>
      prisma.shift.update({
        where: { id: s.id },
        data: {
          clockIn: null,
          clockInSource: null,
          clockOut: null,
          clockOutSource: null,
        },
      })
    )
  );
  return res.status(200).json(updated);
}
