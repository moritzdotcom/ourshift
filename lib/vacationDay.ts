import { Prisma } from '@/generated/prisma';

function parseISO(input: unknown): Date | null {
  if (typeof input !== 'string' || !input) return null;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function buildVacationDayWhereQuery(
  from: unknown,
  to: unknown,
  mode?: 'overlap' | 'contained'
) {
  const fromDate = parseISO(from);
  const toDate = parseISO(to);

  if (from && !fromDate) {
    return { error: 'Ungültiges from-Datum' };
  }
  if (to && !toDate) {
    return { error: 'Ungültiges to-Datum' };
  }
  if (fromDate && toDate && toDate < fromDate) {
    return { error: '"to" darf nicht vor "from" liegen' };
  }

  let where: Prisma.VacationDayWhereInput = {};

  if (fromDate || toDate) {
    if (mode === 'overlap' && fromDate && toDate) {
      where = {
        AND: [{ date: { lt: toDate } }, { date: { gte: fromDate } }],
      };
    } else {
      where = {
        ...(fromDate ? { date: { gte: fromDate } } : {}),
        ...(toDate ? { date: { lte: toDate } } : {}),
      };
    }
  }
  return { where };
}
