import { Prisma } from '@/generated/prisma';
import { pickContractForDate } from '@/lib/digitalContract';
import { hashPassword, hashPin } from '@/lib/password';
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

export type ApiGetUsersResponse = Prisma.UserGetPayload<{
  include: { contracts: true; payRules: true };
}>[];

export type ApiGetSimpleUsersResponse = {
  id: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  vacationDays: number;
  vacationDaysTaken: number;
}[];

async function handleGET(req: NextApiRequest, res: NextApiResponse) {
  const { simple } = req.query;
  if (simple === 'true') {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        isActive: true,
        _count: { select: { vacationDays: true } },
        contracts: true,
      },
      orderBy: { firstName: 'asc' },
    });
    const response = users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      isActive: u.isActive,
      vacationDays:
        pickContractForDate(u.contracts, new Date())?.vacationDaysAnnual || 0,
      vacationDaysTaken: u._count.vacationDays,
    }));
    return res.json(response);
  }
  const users = await prisma.user.findMany({
    include: { contracts: true, payRules: true },
  });
  return res.json(users);
}

async function handlePOST(req: NextApiRequest, res: NextApiResponse) {
  const {
    firstName,
    lastName,
    employeeNumber,
    email,
    phone,
    role,
    isActive,
    password,
    kioskPin,
    employmentStart,
    terminationDate,
  } = req.body;

  const passwordHash = await hashPassword(password);
  const pinHash = await hashPin(kioskPin);

  const created = await prisma.user.create({
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
      credentials: {
        create: { passwordHash },
      },
      kiosk: {
        create: { pinHash },
      },
    },
  });

  return res.status(201).json(created);
}
