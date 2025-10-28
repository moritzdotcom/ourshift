import { Prisma } from '@/generated/prisma';
import { authGuard } from '@/lib/auth';
import prisma from '@/lib/prismadb';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { ok, error } = await authGuard(req, 'MANAGER');
  if (!ok) return res.status(401).json({ error });

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

export type ApiGetPayRulesResponse = Prisma.PayRuleGetPayload<{
  include: { user: { select: { firstName: true; lastName: true } } };
}>[];

async function handleGET(req: NextApiRequest, res: NextApiResponse) {
  const payRules = await prisma.payRule.findMany({
    include: { user: { select: { firstName: true, lastName: true } } },
  });
  return res.json(payRules);
}

async function handlePOST(req: NextApiRequest, res: NextApiResponse) {
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

  const created = await prisma.payRule.create({
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

  return res.status(201).json(created);
}
