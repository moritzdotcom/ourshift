import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prismadb';
import { authGuard } from '@/lib/auth';

function parseDate(str?: string | null): Date | null {
  if (!str) return null;
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dayBefore(iso: string): string {
  const d = new Date(iso);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function overlaps(
  aFrom: Date,
  aUntil: Date | null,
  bFrom: Date,
  bUntil: Date | null
) {
  const aU = aUntil ?? new Date('9999-12-31');
  const bU = bUntil ?? new Date('9999-12-31');
  return aFrom <= bU && bFrom <= aU;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { ok, error } = await authGuard(req, 'MANAGER');
  if (!ok) return res.status(401).json({ error });

  if (req.method !== 'POST') return res.status(405).end();

  const userId = req.query.userId as string;
  const { contract, closeCurrent } = req.body || {};

  if (!userId)
    return res.status(400).json({ error: 'userId fehlt in der URL.' });
  if (!contract?.validFrom)
    return res.status(400).json({ error: 'validFrom ist erforderlich.' });

  const vf = parseDate(contract.validFrom);
  const vu = parseDate(contract.validUntil);

  if (!vf) return res.status(400).json({ error: 'Ungültige Datumsangaben.' });
  if (vu && vu < vf)
    return res
      .status(400)
      .json({ error: '"validUntil" darf nicht vor "validFrom" liegen.' });

  try {
    const existing = await prisma.digitalContract.findMany({
      where: { userId },
      orderBy: { validFrom: 'asc' },
    });

    // alten Vertrag ggf. beenden
    if (closeCurrent) {
      const current = existing.find((x) => {
        const from = new Date(x.validFrom);
        const until = x.validUntil ? new Date(x.validUntil) : null;
        return from <= vf && (!until || until >= vf);
      });
      if (current) {
        await prisma.digitalContract.update({
          where: { id: current.id },
          data: { validUntil: new Date(dayBefore(contract.validFrom)) },
        });
      }
    }

    // Konfliktprüfung
    const after = await prisma.digitalContract.findMany({ where: { userId } });
    const hasConflict = after.some((x) =>
      overlaps(
        vf,
        vu,
        new Date(x.validFrom),
        x.validUntil ? new Date(x.validUntil) : null
      )
    );
    if (hasConflict)
      return res.status(409).json({
        error:
          'Gültigkeitszeitraum überschneidet sich mit einem bestehenden Vertrag.',
      });

    await prisma.digitalContract.create({
      data: {
        userId,
        validFrom: vf,
        validUntil: vu,
        salaryMonthlyCents: contract.salaryMonthlyCents ?? null,
        hourlyRateCents: contract.hourlyRateCents ?? null,
        vacationDaysAnnual: contract.vacationDaysAnnual ?? null,
        weeklyHours: contract.weeklyHours == null ? null : contract.weeklyHours,
      },
    });

    const contracts = await prisma.digitalContract.findMany({
      where: { userId },
      orderBy: { validFrom: 'asc' },
    });

    return res.status(201).json(contracts);
  } catch (e: any) {
    console.error('Contract POST error:', e);
    return res
      .status(500)
      .json({ error: 'Serverfehler beim Erstellen des Vertrags.' });
  }
}
