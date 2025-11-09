import { DateTime } from 'luxon';
export const TZ = 'Europe/Berlin';

// UTC JS Date -> Luxon in Berlin
export const toBerlin = (d: Date) =>
  DateTime.fromJSDate(d, { zone: 'utc' }).setZone(TZ);
// Y-M-D "Wanduhr"-Mitternacht in Berlin -> UTC JS Date
export const berlinMidnightUtc = (y: number, m0: number, d: number) =>
  DateTime.fromObject(
    { year: y, month: m0 + 1, day: d, hour: 0, minute: 0 },
    { zone: TZ }
  )
    .toUTC()
    .toJSDate();

// Day bounds (lokal in Berlin) als UTC-Instants
export function dayBoundsUtc(dayISO: string): {
  startUtc: Date;
  endUtc: Date;
  wall: { start: DateTime; end: DateTime };
} {
  const wallStart = DateTime.fromISO(dayISO, { zone: TZ }).startOf('day');
  const wallEnd = wallStart.plus({ days: 1 });
  return {
    startUtc: wallStart.toUTC().toJSDate(),
    endUtc: wallEnd.toUTC().toJSDate(),
    wall: { start: wallStart, end: wallEnd },
  };
}

// "Wanduhr"-Minute in Berlin -> UTC-Instant
export function wallMinuteToUtc(dayISO: string, minute: number): Date {
  const wall = DateTime.fromISO(dayISO, { zone: TZ })
    .startOf('day')
    .plus({ minutes: minute });
  return wall.toUTC().toJSDate();
}

// Fenster eines Tages (in Berlin) -> Liste von UTC-Intervallen
export function windowsForDayUtc(
  dayISO: string,
  winStartMin?: number | null,
  winEndMin?: number | null
): Array<[Date, Date]> {
  const { wall } = dayBoundsUtc(dayISO);
  if (winStartMin == null || winEndMin == null) {
    return [[wall.start.toUTC().toJSDate(), wall.end.toUTC().toJSDate()]];
  }
  const endMin = winEndMin === 0 ? 24 * 60 : winEndMin;
  if (endMin <= winStartMin) {
    // Über Mitternacht: [00:00..endMin) ∪ [winStartMin..24:00)
    const a1 = wall.start.plus({ minutes: 0 }).toUTC().toJSDate();
    const a2 = wall.start.plus({ minutes: endMin }).toUTC().toJSDate();
    const b1 = wall.start.plus({ minutes: winStartMin }).toUTC().toJSDate();
    const b2 = wall.end.toUTC().toJSDate();
    return [
      [a1, a2],
      [b1, b2],
    ];
  } else {
    const s = wall.start.plus({ minutes: winStartMin }).toUTC().toJSDate();
    const e = wall.start.plus({ minutes: endMin }).toUTC().toJSDate();
    return [[s, e]];
  }
}

// Überlappung in Minuten (UTC-Intervalle)
export const overlapMinutesUtc = (aS: Date, aE: Date, bS: Date, bE: Date) =>
  Math.max(
    0,
    Math.round(
      (Math.min(aE.getTime(), bE.getTime()) -
        Math.max(aS.getTime(), bS.getTime())) /
        60000
    )
  );

// Tag-ISO in Berlin aus UTC
export const dayISOInBerlin = (dUtc: Date) => toBerlin(dUtc).toISODate()!;
