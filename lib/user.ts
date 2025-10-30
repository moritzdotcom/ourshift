export function employedInMonth(
  u: { employmentStart: Date | null; terminationDate: Date | null },
  year: number,
  month: number
) {
  const bom = new Date(year, month, 1);
  const eom = new Date(year, month + 1, 1);

  if (!u.employmentStart) return false;

  const es = new Date(u.employmentStart);

  if (u.terminationDate) {
    const td = new Date(u.terminationDate);
    return td > bom && es < eom;
  }

  return es < eom;
}
