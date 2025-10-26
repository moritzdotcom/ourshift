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
  } else if (req.method === 'DELETE') {
    await handleDELETE(req, res);
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    );
  }
}

async function handleGET(req: NextApiRequest, res: NextApiResponse) {
  const holidays = await prisma.holiday.findMany();
  return res.json(holidays);
}

async function handlePOST(req: NextApiRequest, res: NextApiResponse) {
  const data = req.body;

  if (Array.isArray(data) === false) {
    return res.status(400).json({ error: 'Expected an array of holidays' });
  }

  const holidays = await prisma.holiday.createManyAndReturn({
    data: data.map((h: { date: string; name: string }) => ({
      date: new Date(h.date),
      name: h.name,
    })),
    skipDuplicates: true,
  });

  return res.status(200).json(holidays);
}

async function handleDELETE(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid id' });
  }

  await prisma.holiday.delete({
    where: { id },
  });

  return res.status(204).end();
}
