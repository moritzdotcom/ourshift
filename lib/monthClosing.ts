import { MonthClosingShift } from '@/pages/management/monthClosing';

export type ShiftPart = {
  // Basis
  id: string;
  userId: string;
  code?: string | null;
  isStamped: boolean; // clockIn && clockOut
  source: 'clock' | 'planned';
  // Zeit & Tag
  day: number; // 1..n (im gewählten Monat)
  start: Date; // im Tag geclamped
  end: Date; // im Tag geclamped
  durationMin: number;
  // Layout
  col: number; // 0..(cols-1)
  cols: number; // Gesamtspalten der Overlap-Gruppe
  topPx: number;
  heightPx: number;
  leftPct: number; // 0..100
  widthPct: number; // 0..100
  // für Aktionen
  originalShift: MonthClosingShift;
};

// Strikte Überlappung (Ende == Start zählt NICHT)
function overlaps(
  a: { start: Date; end: Date },
  b: { start: Date; end: Date }
) {
  return a.start < b.end && b.start < a.end;
}

/** 1) Baue Overlap-Gruppen per Sweep + Union-Find (vereinfachte Variante) */
function buildOverlapGroups(parts: ShiftPart[]): ShiftPart[][] {
  // sort nach start-zeit
  const arr = [...parts].sort((a, b) => a.start.getTime() - b.start.getTime());

  // Union-Find
  const parent = new Map<ShiftPart, ShiftPart>();
  const find = (x: ShiftPart): ShiftPart => {
    const p = parent.get(x) ?? x;
    if (p !== x) {
      const r = find(p);
      parent.set(x, r);
      return r;
    }
    return x;
  };
  const union = (a: ShiftPart, b: ShiftPart) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  // Sweep: aktives Fenster
  const active: ShiftPart[] = [];
  for (const cur of arr) {
    // alles entfernen, was beendet ist
    for (let i = active.length - 1; i >= 0; i--) {
      if (active[i].end.getTime() <= cur.start.getTime()) active.splice(i, 1);
    }
    // cur mit allen aktiven vereinen (die überlappen)
    for (const a of active) {
      if (overlaps(a, cur)) union(a, cur);
    }
    active.push(cur);
  }

  // Gruppen bilden
  const groupsMap = new Map<ShiftPart, ShiftPart[]>();
  for (const p of arr) {
    const r = find(p);
    if (!groupsMap.has(r)) groupsMap.set(r, []);
    groupsMap.get(r)!.push(p);
  }
  return Array.from(groupsMap.values());
}

/** 2) Spaltenzuweisung innerhalb einer Gruppe (Interval Partitioning) */
function assignColumnsForGroup(group: ShiftPart[]) {
  // sort by start then end
  const evts = [...group].sort(
    (a, b) =>
      a.start.getTime() - b.start.getTime() || a.end.getTime() - b.end.getTime()
  );

  type Active = { end: number; col: number; item: ShiftPart };
  const active: Active[] = [];
  const freeCols: number[] = []; // wiederverwendbare Spaltenindizes
  let maxCols = 0;

  for (const e of evts) {
    const nowStart = e.start.getTime();

    // abgelaufene entfernen und Spalten freigeben
    for (let i = active.length - 1; i >= 0; i--) {
      if (active[i].end <= nowStart) {
        freeCols.push(active[i].col);
        active.splice(i, 1);
      }
    }

    // kleinste freie Spalte
    let col: number;
    if (freeCols.length > 0) {
      freeCols.sort((a, b) => a - b); // kleinste zuerst
      col = freeCols.shift()!;
    } else {
      col = maxCols; // neue Spalte
    }

    e.col = col;
    active.push({ end: e.end.getTime(), col, item: e });
    if (col + 1 > maxCols) maxCols = col + 1;
  }

  // allen Events dieselbe Gesamtspaltenzahl der Gruppe geben
  for (const e of group) {
    e.cols = maxCols;
  }
}

/** 3) Tageslayout komplett: Gruppen bilden, Spalten zuweisen, Positionen rechnen */
function layoutDay(
  parts: ShiftPart[],
  headerHeight: number,
  hourHeight: number
) {
  const groups = buildOverlapGroups(parts);
  for (const g of groups) assignColumnsForGroup(g);

  // Positionen (Top/Height/Left/Width)
  const minuteHeight = hourHeight / 60;
  for (const p of parts) {
    const topMin = p.start.getHours() * 60 + p.start.getMinutes();
    const durMin = Math.max(
      1,
      Math.round((p.end.getTime() - p.start.getTime()) / 60000)
    );
    p.durationMin = durMin;
    p.topPx = headerHeight + topMin * minuteHeight;
    p.heightPx = Math.max(6, durMin * minuteHeight);

    const total = Math.max(1, p.cols);
    p.leftPct = (p.col / total) * 100;
    p.widthPct = (1 / total) * 100;
  }
  return parts;
}

function clampToDay(
  start: Date,
  end: Date,
  y: number,
  m0: number,
  day: number
) {
  const dayStart = new Date(y, m0, day, 0, 0, 0, 0);
  const dayEnd = new Date(y, m0, day, 23, 59, 59, 999);
  const s = start < dayStart ? dayStart : start;
  const e = end > dayEnd ? dayEnd : end;
  return { s, e };
}

// wähle anzuzeigendes Intervall
function displayInterval(shift: MonthClosingShift): {
  s: Date;
  e: Date;
  source: 'clock' | 'planned';
} {
  const s = new Date(shift.clockIn ?? shift.start);
  const e = new Date(shift.clockOut ?? shift.end);
  return {
    s,
    e,
    source: shift.clockIn && shift.clockOut ? 'clock' : 'planned',
  };
}

// Split über Mitternacht in Tage des Monats
function splitShiftIntoDays(shift: MonthClosingShift, y: number, m0: number) {
  const { s, e, source } = displayInterval(shift);
  const firstDay = 1;
  const lastDay = new Date(y, m0 + 1, 0).getDate();

  // clamp auf Monatsgrenzen
  const monthStart = new Date(y, m0, firstDay, 0, 0, 0, 0);
  const monthEnd = new Date(y, m0, lastDay, 23, 59, 59, 999);
  if (e < monthStart || s > monthEnd) return [];

  const start = s < monthStart ? monthStart : s;
  const end = e > monthEnd ? monthEnd : e;

  const parts: {
    day: number;
    start: Date;
    end: Date;
    source: 'clock' | 'planned';
  }[] = [];

  // iteriere alle Tage zwischen start..end (inkl)
  const d0 = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const d1 = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  for (
    let d = new Date(d0);
    d <= d1;
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
  ) {
    const day = d.getDate();
    if (day < firstDay || day > lastDay) continue;
    const { s: cs, e: ce } = clampToDay(start, end, y, m0, day);
    parts.push({ day, start: cs, end: ce, source });
  }
  return parts;
}

export function buildMonthLayout(
  shifts: MonthClosingShift[],
  year: number,
  month0: number,
  headerHeight: number,
  hourHeight: number
) {
  const lastDay = new Date(year, month0 + 1, 0).getDate();

  // Split in Parts
  const perDay: Record<number, ShiftPart[]> = {};
  for (let d = 1; d <= lastDay; d++) perDay[d] = [];

  for (const s of shifts) {
    const parts = splitShiftIntoDays(s, year, month0);
    const isStamped = Boolean(s.clockIn && s.clockOut);
    for (const part of parts) {
      const sp: ShiftPart = {
        id: s.id + ':' + part.day,
        userId: s.user.id,
        code: s.code?.code ?? null,
        isStamped,
        source: part.source,
        day: part.day,
        start: part.start,
        end: part.end,
        durationMin: 0,
        col: 0,
        cols: 1,
        topPx: 0,
        heightPx: 0,
        leftPct: 0,
        widthPct: 100,
        originalShift: s,
      };
      perDay[part.day].push(sp);
    }
  }

  // Overlap & Positions pro Tag
  for (let d = 1; d <= lastDay; d++) {
    perDay[d] = layoutDay(perDay[d], headerHeight, hourHeight);
  }

  return perDay; // { [day]: ShiftPart[] }
}
