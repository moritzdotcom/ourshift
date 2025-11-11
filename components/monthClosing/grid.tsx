import { buildMonthLayout } from '@/lib/monthClosing';
import { MonthClosingShift } from '@/pages/management/monthClosing';
import { useMemo } from 'react';
import MonthClosingShiftPart from './shiftPart';
import MonthClosingTimeColumn from './timeColumn';

function dayLabel(dt: Date) {
  return dt.toLocaleDateString('de-DE', { weekday: 'short' });
}

export default function MonthClosingGrid({
  year,
  month,
  shifts,
  onUpdate,
  columnWidth,
}: {
  year: number;
  month: number;
  shifts: MonthClosingShift[];
  onUpdate: (part: MonthClosingShift, del?: boolean) => void;
  columnWidth: number;
}) {
  const HEADER_HEIGHT = 50;
  const HOUR_HEIGHT = 30;

  const days = useMemo(() => {
    const arr: Date[] = [];
    for (let d = 1; d <= new Date(year, month + 1, 0).getDate(); d++) {
      arr.push(new Date(year, month, d, 2));
    }
    return arr;
  }, [year, month]);

  // Layout-Daten vorbereiten
  const partsByDay = useMemo(() => {
    return buildMonthLayout(shifts, year, month, HEADER_HEIGHT, HOUR_HEIGHT);
  }, [shifts, year, month]);

  return (
    <div className="flex items-start gap-2">
      {/* linke Zeitspalte */}
      <MonthClosingTimeColumn
        marginTop={HEADER_HEIGHT}
        itemHeight={HOUR_HEIGHT}
      />

      {/* Tages-Spalten */}
      <div
        className="w-full h-full overflow-x-scroll grid bg-white rounded"
        style={{
          gridTemplateColumns: `repeat(${days.length}, ${columnWidth}px)`,
          height: 24 * HOUR_HEIGHT + HEADER_HEIGHT,
          position: 'relative',
        }}
      >
        {days.map((d) => {
          const dayNum = d.getDate();
          const parts = partsByDay[dayNum] || [];
          return (
            <div
              key={dayNum}
              className="relative border-r border-slate-200 last:border-r-0"
            >
              {/* Header der Spalte */}
              <div
                className="flex flex-col items-center justify-center w-full p-1 absolute border-b border-slate-200 bg-white z-10"
                style={{ height: HEADER_HEIGHT, top: 0, left: 0, right: 0 }}
              >
                <div className="text-sm font-medium">{dayNum}</div>
                <div className="text-xs text-stone-700">{dayLabel(d)}</div>
              </div>

              {/* Stundenlinien */}
              <div className="absolute inset-0" style={{ top: HEADER_HEIGHT }}>
                {Array.from({ length: 24 }).map((_, h) => (
                  <div
                    key={h}
                    className="border-b border-slate-100"
                    style={{ height: HOUR_HEIGHT }}
                  />
                ))}
              </div>

              {/* Events */}
              <div
                className="absolute inset-0"
                style={{ top: 0, left: 0, right: 0 }}
              >
                {parts.map((p) => (
                  <MonthClosingShiftPart
                    key={p.id}
                    part={p}
                    onUpdate={onUpdate}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
