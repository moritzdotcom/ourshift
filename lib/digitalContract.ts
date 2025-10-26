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
