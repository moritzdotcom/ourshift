import { buildMonthLayoutHorizontal } from '@/lib/monthClosing';
import { MonthClosingShift } from '@/pages/management/monthClosing';
import { useMemo } from 'react';
import MonthClosingShiftPart from './shiftPart';
import { useElementSize } from '@/hooks/useElementSize';

function dayLabel(dt: Date) {
  return dt.toLocaleDateString('de-DE', { weekday: 'short' });
}

function HourHeader({
  hourWidth,
  showMinutes,
}: {
  hourWidth: number;
  showMinutes?: boolean;
}) {
  return (
    <div className="flex w-full">
      {Array.from({ length: 24 }).map((_, h) => (
        <div
          key={h}
          className="text-stone-400 text-xs border-l border-slate-300 first:border-l-0"
          style={{ width: hourWidth, paddingLeft: 6 }}
        >
          {h.toString().padStart(2, '0')}
          {showMinutes ? ':00' : ''}
        </div>
      ))}
    </div>
  );
}

export default function MonthClosingGrid({
  year,
  month,
  shifts,
  onUpdate,
}: {
  year: number;
  month: number;
  shifts: MonthClosingShift[];
  onUpdate: (part: MonthClosingShift, del?: boolean) => void;
}) {
  const HEADER_HEIGHT = 30;
  const DAY_LABEL_WIDTH = 50;

  // columnWidth wirkt sich auf Lane-Höhe aus:
  const LANE_HEIGHT = 50;

  const days = useMemo(() => {
    const arr: Date[] = [];
    for (let d = 1; d <= new Date(year, month + 1, 0).getDate(); d++) {
      arr.push(new Date(year, month, d, 2));
    }
    return arr;
  }, [year, month]);

  // Wir messen die Breite des "Timeline"-Bereichs (ohne Day-Label-Spalte)
  const { ref: outerRef, width: outerWidth } = useElementSize<HTMLDivElement>();
  const timelineWidth = Math.max(0, outerWidth - DAY_LABEL_WIDTH);
  console.log(outerWidth);

  // Jede Stunde bekommt exakt 1/24 der verfügbaren Breite
  const hourWidth = Math.max(8, timelineWidth / 24); // min clamp, sonst wird’s zu klein

  const { perDay, dayHeights } = useMemo(() => {
    // buildMonthLayout nimmt jetzt (hourWidth, laneHeight)
    return buildMonthLayoutHorizontal(
      shifts,
      year,
      month,
      hourWidth,
      LANE_HEIGHT
    );
  }, [shifts, year, month, hourWidth, LANE_HEIGHT]);

  return (
    <div
      ref={outerRef}
      className="w-full h-full bg-white rounded border border-slate-200 overflow-x-hidden overflow-y-auto"
    >
      {/* Sticky Top Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-300 flex">
        <div style={{ width: DAY_LABEL_WIDTH, height: HEADER_HEIGHT }} />
        <div className="flex-1" style={{ height: HEADER_HEIGHT }}>
          <div className="pt-2">
            <HourHeader hourWidth={hourWidth} showMinutes={outerWidth > 1100} />
          </div>
        </div>
      </div>

      {/* Rows */}
      <div>
        {days.map((d) => {
          const dayNum = d.getDate();
          const parts = perDay[dayNum] || [];
          const rowHeight = Math.max(
            LANE_HEIGHT,
            dayHeights[dayNum] ?? LANE_HEIGHT
          );

          return (
            <div key={dayNum} className="flex border-b-2 border-slate-400">
              {/* Sticky Day label */}
              <div
                className="sticky left-0 z-10 bg-white border-r border-slate-200 flex flex-col items-center justify-center"
                style={{ width: DAY_LABEL_WIDTH, height: rowHeight }}
              >
                <div className="text-sm font-medium">{dayNum}</div>
                <div className="text-xs text-stone-700">{dayLabel(d)}</div>
              </div>

              {/* Timeline cell fills remaining width; NO horizontal scroll */}
              <div className="relative flex-1" style={{ height: rowHeight }}>
                {/* Hour lines */}
                <div className="absolute inset-0 pointer-events-none">
                  {Array.from({ length: 24 }).map((_, h) => (
                    <div
                      key={h}
                      className="absolute top-0 bottom-0 border-l border-slate-300"
                      style={{ left: h * hourWidth }}
                    />
                  ))}
                </div>

                {/* Events */}
                <div className="absolute inset-0">
                  {parts.map((p) => (
                    <MonthClosingShiftPart
                      key={p.id}
                      part={p}
                      onUpdate={onUpdate}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
