import { Prisma } from '@/generated/prisma';

function parseISO(input: unknown): Date | null {
  if (typeof input !== 'string' || !input) return null;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function buildVacationDayWhereQuery(
  from: unknown,
  to: unknown,
  mode?: 'overlap' | 'contained',
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
        AND: [{ date: { lt: endOfDay(toDate) } }, { date: { gte: fromDate } }],
      };
    } else {
      if (fromDate && toDate) {
        where = { date: { gte: fromDate, lte: endOfDay(toDate) } };
      } else {
        where = {
          ...(fromDate ? { date: { gte: fromDate } } : {}),
          ...(toDate ? { date: { lte: endOfDay(toDate) } } : {}),
        };
      }
    }
  }
  return { where };
}
