import prisma from '@/lib/prismadb';
import { ruleActiveOnDay } from './payRule';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';

export type TimeSheetShift = {
  start: string; // ISO
  end: string; // ISO
  hours: number; // decimal hours
};

export type TimeSheetDay = {
  day: number; // 1..31
  shifts: TimeSheetShift[];
  supplements: number; // euros, 2 decimals
};

const TZ = 'Europe/Berlin';

export function startOfDay(date: Date) {
  const zoned = toZonedTime(date, TZ); // Date in Berlin-Zeit
  zoned.setHours(0, 0, 0, 0); // 00:00 Berlin
  return fromZonedTime(zoned, TZ); // zurück nach UTC
}

export function endOfDay(date: Date) {
  const zoned = toZonedTime(date, TZ);
  zoned.setHours(23, 59, 59, 999);
  return fromZonedTime(zoned, TZ);
}

export function addDays(date: Date, days: number) {
  const zoned = toZonedTime(date, TZ);
  zoned.setDate(zoned.getDate() + days); // +1 Kalendertag in Berlin
  return fromZonedTime(zoned, TZ);
}

export function isoDayKey(date: Date) {
  return formatInTimeZone(date, TZ, 'yyyy-MM-dd'); // Key aus Berlin-Sicht
}

function minutesToDate(dayStart: Date, minutes: number) {
  return new Date(dayStart.getTime() + minutes * 60_000);
}

function clamp(a: Date, lo: Date, hi: Date) {
  return new Date(Math.min(hi.getTime(), Math.max(lo.getTime(), a.getTime())));
}

function overlapMs(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  const s = Math.max(aStart.getTime(), bStart.getTime());
  const e = Math.min(aEnd.getTime(), bEnd.getTime());
  return Math.max(0, e - s);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function centsToEuros2(cents: number) {
  return round2(cents / 100);
}

function decimalToNumber(d: any): number {
  // Prisma Decimal kann je nach Setup string/Decimal.js sein
  if (d == null) return 0;
  if (typeof d === 'number') return d;
  if (typeof d === 'string') return Number(d);
  if (typeof d === 'object' && typeof d.toNumber === 'function')
    return d.toNumber();
  return Number(d);
}

type PayRuleLite = {
  windowStartMin: number | null;
  windowEndMin: number | null;
  daysOfWeek: number[];
  holidayOnly: boolean;
  excludeHolidays: boolean;
  validFrom: Date;
  validUntil: Date | null;
  percent: any; // Decimal
};

function ruleIntervalsForDay(
  rule: PayRuleLite,
  dayStart: Date
): Array<[Date, Date]> {
  // Liefert Intervalle innerhalb dieses Tages, in denen die Rule gilt.
  // - null = ganztägig
  // - over-midnight (end < start): zwei Intervalle am selben Tag (00:00..end) und (start..23:59:59.999)
  const ds = dayStart;
  const de = endOfDay(dayStart);

  if (rule.windowStartMin == null || rule.windowEndMin == null) {
    return [[ds, de]];
  }

  const sMin = rule.windowStartMin;
  const eMin = rule.windowEndMin;

  if (eMin >= sMin) {
    return [[minutesToDate(ds, sMin), minutesToDate(ds, eMin)]];
  }

  // over midnight
  return [
    [ds, minutesToDate(ds, eMin)],
    [minutesToDate(ds, sMin), de],
  ];
}

function findHourlyRateCentsForDate(
  contracts: Array<{
    validFrom: Date;
    validUntil: Date | null;
    hourlyRateCents: number | null;
  }>,
  dayStart: Date
) {
  const t = dayStart.getTime();
  // "aktiver" Vertrag: validFrom <= day && (validUntil null oder >= day)
  const active = contracts
    .filter(
      (c) =>
        c.validFrom.getTime() <= t &&
        (!c.validUntil || c.validUntil.getTime() >= t)
    )
    .sort((a, b) => b.validFrom.getTime() - a.validFrom.getTime())[0];

  return active?.hourlyRateCents ?? 0;
}

export async function getUserTimesheet(userId: string, from: Date, to: Date) {
  const fromDay = startOfDay(from);
  const toDay = startOfDay(to);

  const [user, holidays] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        contracts: {
          select: { validFrom: true, validUntil: true, hourlyRateCents: true },
          orderBy: { validFrom: 'asc' },
        },
        payRules: {
          select: {
            windowStartMin: true,
            windowEndMin: true,
            daysOfWeek: true,
            holidayOnly: true,
            excludeHolidays: true,
            validFrom: true,
            validUntil: true,
            percent: true,
          },
        },
      },
    }),
    prisma.holiday.findMany({
      where: {
        date: {
          gte: fromDay,
          lt: addDays(toDay, 1),
        },
      },
      select: { date: true },
    }),
  ]);

  if (!user) throw new Error('User not found');

  // Shifts: alles was irgendwie den Range schneidet (wichtig bei Over-midnight)
  const shifts = await prisma.shift.findMany({
    where: {
      userId,
      start: { lt: addDays(toDay, 1) },
      end: { gt: fromDay },
      // optional: nur "gearbeitete" mit clockIn/out? Ich nehme: wenn clockIn/out vorhanden -> die, sonst fallback start/end
    },
    select: {
      id: true,
      start: true,
      end: true,
      clockIn: true,
      clockOut: true,
    },
    orderBy: { start: 'asc' },
  });

  // Output Tage initialisieren
  const days: Record<
    string,
    {
      day: number;
      shifts: TimeSheetShift[];
      supplementsCents: number;
      dayStart: Date;
    }
  > = {};
  for (
    let d = new Date(fromDay);
    d.getTime() <= toDay.getTime();
    d = addDays(d, 1)
  ) {
    const key = isoDayKey(d);
    days[key] = {
      day: d.getDate(),
      shifts: [],
      supplementsCents: 0,
      dayStart: new Date(d),
    };
  }

  const payRules: PayRuleLite[] = user.payRules;

  // Hilfsfunktion: Supplements für ein Segment innerhalb eines Tages berechnen
  function calcSupplementsCentsForSegment(
    dayStartDate: Date,
    segStart: Date,
    segEnd: Date
  ) {
    const dayKey = isoDayKey(dayStartDate);
    const hourlyRateCents = findHourlyRateCentsForDate(
      user!.contracts,
      dayStartDate
    );

    if (!hourlyRateCents) return 0;

    let cents = 0;

    for (const rule of payRules) {
      if (!ruleActiveOnDay(rule, dayKey, holidays)) continue;

      const percent = decimalToNumber(rule.percent); // z.B. 25.00
      if (!percent) continue;

      const intervals = ruleIntervalsForDay(rule, dayStartDate);

      let overlapTotalMs = 0;
      for (const [rStart, rEnd] of intervals) {
        overlapTotalMs += overlapMs(segStart, segEnd, rStart, rEnd);
      }
      if (!overlapTotalMs) continue;

      const overlapHours = overlapTotalMs / 3_600_000;
      // Zuschlag = hourlyRate * (percent/100) * overlapHours
      const add = hourlyRateCents * (percent / 100) * overlapHours;

      // sauber runden auf Cent
      cents += Math.round(add);
    }

    return cents;
  }

  // Shifts verarbeiten (splitten pro Tag)
  for (const s of shifts) {
    const actualStart = s.clockIn ?? s.start;
    const actualEnd = s.clockOut ?? s.end;

    if (!actualStart || !actualEnd) continue;
    if (actualEnd.getTime() <= actualStart.getTime()) continue;

    // clamp auf Range
    let cur = clamp(actualStart, fromDay, addDays(toDay, 1));
    const hardEnd = clamp(actualEnd, fromDay, addDays(toDay, 1));
    if (hardEnd.getTime() <= cur.getTime()) continue;

    while (cur.getTime() < hardEnd.getTime()) {
      const dStart = startOfDay(cur);
      const dEnd = addDays(dStart, 1); // exklusives Tagesende
      const segEnd = new Date(Math.min(hardEnd.getTime(), dEnd.getTime()));

      const dayKey = isoDayKey(dStart);
      if (days[dayKey]) {
        const hours = (segEnd.getTime() - cur.getTime()) / 3_600_000;

        days[dayKey].shifts.push({
          start: cur.toISOString(),
          end: segEnd.toISOString(),
          hours: round2(hours),
        });

        days[dayKey].supplementsCents += calcSupplementsCentsForSegment(
          dStart,
          cur,
          segEnd
        );
      }

      cur = segEnd;
    }
  }

  // Response sortieren in Tagesreihenfolge
  const out: TimeSheetDay[] = Object.values(days)
    .sort((a, b) => a.dayStart.getTime() - b.dayStart.getTime())
    .map((d) => ({
      day: d.day,
      shifts: d.shifts,
      supplements: centsToEuros2(d.supplementsCents),
    }));

  return out;
}
