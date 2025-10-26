import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prismadb';

export default async function PUT(req: NextApiRequest, res: NextApiResponse) {
  const items = req.body as { id: string; sortOrder: number }[];

  if (!items.length) return new Response('ok');

  await prisma.$transaction(
    items.map((i) =>
      prisma.shiftCode.update({
        where: { id: i.id },
        data: { sortOrder: i.sortOrder },
      })
    )
  );

  return res.status(200).json({ message: 'ok' });
}
