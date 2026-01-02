import { Prisma } from '@/generated/prisma';
import { dayBoundsUtc, toBerlin } from './time';

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

export function shiftIsActive(
  shift: { start: Date | string; end: Date | string },
  gracePeriod?: number
) {
  const now = new Date();
  const start = new Date(new Date(shift.start).getTime() - (gracePeriod || 0));
  const end = new Date(new Date(shift.end).getTime() + (gracePeriod || 0));
  return now > start && now < end;
}

export function splitShiftByDay(startUtc: Date, endUtc: Date) {
  const parts: { day: string; segStart: Date; segEnd: Date }[] = [];
  // in Berlin "laufen", aber Segmente als UTC-JS-Dates zurückgeben
  let curWall = toBerlin(startUtc);
  const endWall = toBerlin(endUtc);

  while (curWall < endWall) {
    const dayISO = curWall.toISODate()!;
    const { startUtc: dayStartUtc, endUtc: dayEndUtc } = dayBoundsUtc(dayISO);
    const segStart = new Date(
      Math.max(startUtc.getTime(), dayStartUtc.getTime())
    );
    const segEnd = new Date(Math.min(endUtc.getTime(), dayEndUtc.getTime()));
    parts.push({ day: dayISO, segStart, segEnd });
    curWall = curWall.plus({ days: 1 }).startOf('day');
  }
  return parts;
}
