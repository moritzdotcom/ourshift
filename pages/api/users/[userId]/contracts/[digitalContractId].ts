import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prismadb';
import { authGuard } from '@/lib/auth';

function parseDate(str?: string | null): Date | null {
  if (!str) return null;
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
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

  if (req.method !== 'PUT') return res.status(405).end();

  const userId = req.query.userId as string;
  const contractId = req.query.digitalContractId as string;
  const c = req.body;

  if (!userId || !contractId)
    return res.status(400).json({ error: 'userId oder contractId fehlt.' });

  const vf = parseDate(c.validFrom);
  const vu = parseDate(c.validUntil);

  if (!vf) return res.status(400).json({ error: 'Ungültige Datumsangaben.' });
  if (vu && vu < vf)
    return res
      .status(400)
      .json({ error: '"validUntil" darf nicht vor "validFrom" liegen.' });

  try {
    const existing = await prisma.digitalContract.findUnique({
      where: { id: contractId },
    });
    if (!existing || existing.userId !== userId)
      return res.status(404).json({ error: 'Vertrag nicht gefunden.' });

    // Konfliktprüfung mit anderen Verträgen
    const others = await prisma.digitalContract.findMany({
      where: { userId, NOT: { id: contractId } },
    });
    const conflict = others.some((x) =>
      overlaps(
        vf,
        vu,
        new Date(x.validFrom),
        x.validUntil ? new Date(x.validUntil) : null
      )
    );
    if (conflict)
      return res.status(409).json({
        error:
          'Gültigkeitszeitraum überschneidet sich mit einem anderen Vertrag.',
      });

    const updated = await prisma.digitalContract.update({
      where: { id: contractId },
      data: {
        validFrom: vf,
        validUntil: vu,
        salaryMonthlyCents: c.salaryMonthlyCents ?? null,
        hourlyRateCents: c.hourlyRateCents ?? null,
        vacationDaysAnnual: c.vacationDaysAnnual ?? null,
        weeklyHours: c.weeklyHours == null ? null : c.weeklyHours,
        vacationBonus: c.vacationBonus ?? null,
        christmasBonus: c.christmasBonus ?? null,
      },
    });

    return res.status(200).json(updated);
  } catch (e: any) {
    console.error('Contract PUT error:', e);
    return res
      .status(500)
      .json({ error: 'Serverfehler beim Aktualisieren des Vertrags.' });
  }
}
