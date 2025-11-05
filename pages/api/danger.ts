import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prismadb';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const shifts = await prisma.shift.findMany({
    where: { code: { code: 'ND' }, clockIn: null, clockOut: null },
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
  return res.status(200).json(updated);
}
