import { Prisma } from '@/generated/prisma';

function parseISO(input: unknown): Date | null {
  if (typeof input !== 'string' || !input) return null;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function buildShiftWhereQuery(
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

  let where: Prisma.ShiftWhereInput = {};

  if (fromDate || toDate) {
    if (mode === 'overlap' && fromDate && toDate) {
      where = {
        AND: [{ start: { lt: toDate } }, { end: { gte: fromDate } }],
      };
    } else {
      where = {
        ...(fromDate ? { start: { gte: fromDate } } : {}),
        ...(toDate ? { end: { lte: toDate } } : {}),
      };
    }
  }
  return { where };
}
