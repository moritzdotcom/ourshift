import { Decimal } from '@prisma/client/runtime/library';

export function pickContractForDate<
  C extends {
    validFrom: Date | string | null;
    validUntil: Date | string | null;
  }
>(contracts: C[], date: Date): C | null {
  const t = date.getTime();
  let best: C | null = null;
  for (const c of contracts) {
    if (!c.validFrom) continue;
    const from = new Date(c.validFrom).getTime();
    const to = c.validUntil
      ? new Date(c.validUntil).getTime()
      : Number.MAX_SAFE_INTEGER;
    if (t >= from && t <= to) best = c;
  }
  return best;
}

export function hourlyFromContract(
  c: {
    hourlyRateCents: number | null;
    salaryMonthlyCents: number | null;
    weeklyHours: Decimal | null;
  } | null
): number | null {
  if (!c) return null;
  if (c.hourlyRateCents != null) return c.hourlyRateCents;
  if (
    c.salaryMonthlyCents != null &&
    c.weeklyHours != null &&
    Number(c.weeklyHours) > 0
  ) {
    const hoursPerMonth = Number(c.weeklyHours) * (52 / 12); // ~4.333 Wochen
    return Math.round(c.salaryMonthlyCents / hoursPerMonth);
  }
  return null;
}
