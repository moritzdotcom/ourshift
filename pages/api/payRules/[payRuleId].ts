import prisma from '@/lib/prismadb';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { payRuleId } = req.query;
  if (typeof payRuleId !== 'string') {
    return res.status(400).json({ error: 'Invalid payRuleId' });
  }
  if (req.method === 'PUT') {
    await handlePUT(req, res, payRuleId);
  } else if (req.method === 'DELETE') {
    await handleDELETE(req, res, payRuleId);
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
    userId,
    name,
    windowStartMin,
    windowEndMin,
    daysOfWeek,
    holidayOnly,
    excludeHolidays,
    validFrom,
    validUntil,
    percent,
  } = req.body;

  const updated = await prisma.payRule.update({
    where: { id },
    data: {
      userId,
      name,
      windowStartMin,
      windowEndMin,
      daysOfWeek,
      holidayOnly,
      excludeHolidays,
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validUntil: validUntil ? new Date(validUntil) : null,
      percent,
    },
    include: { user: { select: { firstName: true, lastName: true } } },
  });

  return res.status(200).json(updated);
}

async function handleDELETE(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string
) {
  await prisma.payRule.delete({
    where: { id },
  });
  return res.status(204).end();
}
