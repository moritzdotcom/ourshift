import { useEffect, useMemo, useState } from 'react';
import { Button, Center, Loader } from '@mantine/core';
import axios from 'axios';
import { dateToISO } from '@/lib/dates';
import { ApiGetSimpleUsersResponse } from '@/pages/api/users';
import { ApiGetShiftsResponse } from '@/pages/api/shifts';
import { useRouter } from 'next/router';
import { useViewportSize } from '@mantine/hooks';
import { MonthClosingShift } from '.';
import Link from 'next/link';
import { IconChevronLeft } from '@tabler/icons-react';
import { buildMonthLayoutHorizontal } from '@/lib/monthClosing';
import { timeToHuman } from '@/lib/dates';
import { ShiftPart } from '@/lib/monthClosing';
import { useElementSize } from '@/hooks/useElementSize';

export default function MonthClosingPagePrint() {
  // Monat wählen
  const { query } = useRouter();

  const year = useMemo(
    () => (query.year ? Number(query.year) : null),
    [query.year]
  );
  const month = useMemo(
    () => (query.month ? Number(query.month) : null),
    [query.month]
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [shifts, setShifts] = useState<MonthClosingShift[]>([]);

  const monthLabel =
    year &&
    month &&
    new Date(year, month, 15).toLocaleDateString('de-DE', {
      month: 'long',
      year: 'numeric',
    });

  useEffect(() => {
    if (year && month && !loading && !error) {
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [year, month, loading, error]);

  // laden
  useEffect(() => {
    async function load() {
      if (!year || !month) return;
      setLoading(true);
      const [{ data: emps }, { data: sh }] = await Promise.all([
        axios.get<ApiGetSimpleUsersResponse>('/api/users?simple=true'),
        axios.get<ApiGetShiftsResponse>('/api/shifts', {
          params: {
            from: dateToISO(new Date(year, month, 1)),
            to: dateToISO(new Date(year, month + 1, 2)),
          },
        }),
      ]);
      const shfts = sh.map((s) => ({
        ...s,
        user: emps.find((e) => e.id === s.userId),
      })) as MonthClosingShift[];
      setShifts(shfts);
      setLoading(false);
    }
    load();
  }, [year, month]);

  return (
    <div className="print-root mx-3 print:mx-0">
      <div className="print:hidden my-3">
        <Link href="/management/monthClosing">
          <Button variant="light" leftSection={<IconChevronLeft />}>
            Zurück
          </Button>
        </Link>
      </div>
      <header className="flex justify-between items-center mb-6">
        <div className="text-xl font-medium">
          Monatsabschluss - {monthLabel}
        </div>
        <div className="text-sm">
          Erstellt am {new Date().toLocaleDateString('de-DE')}
        </div>
      </header>

      {error && <div className="text-red-600">Fehler: {error}</div>}

      {loading || !year || !month ? (
        <Center>
          <Loader />
        </Center>
      ) : (
        <MonthClosingGridPrint year={year} month={month} shifts={shifts} />
      )}

      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 12mm;
        }
        @media print {
          html,
          body {
            background: white !important;
          }
          .state {
            display: none;
          }
        }
        .print-root {
          font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          color: #111;
        }
      `}</style>
    </div>
  );
}

function dayLabel(dt: Date) {
  return dt.toLocaleDateString('de-DE', { weekday: 'short' });
}

const PRINT_DAY_LABEL_WIDTH = 50;
const PRINT_HEADER_HEIGHT = 40;
const PRINT_LANE_HEIGHT = 60; // <- anpassen (mehr = höhere Zeilen)

function HourHeaderPrint() {
  return (
    <div
      className="grid w-full"
      style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}
    >
      {Array.from({ length: 24 }).map((_, h) => (
        <div
          key={h}
          className="text-stone-600 text-xs border-l border-slate-200 first:border-l-0 pl-1"
        >
          {h.toString().padStart(2, '0')}
        </div>
      ))}
    </div>
  );
}

function MonthClosingGridPrint({
  year,
  month,
  shifts,
}: {
  year: number;
  month: number;
  shifts: MonthClosingShift[];
}) {
  const days = useMemo(() => {
    const arr: Date[] = [];
    for (let d = 1; d <= new Date(year, month + 1, 0).getDate(); d++) {
      arr.push(new Date(year, month, d, 2));
    }
    return arr;
  }, [year, month]);

  const { ref, width } = useElementSize<HTMLDivElement>();

  const timelineWidth = Math.max(1, width - PRINT_DAY_LABEL_WIDTH);
  const hourWidth = timelineWidth / 24;

  // buildMonthLayout muss die neue Signatur haben
  const { perDay, dayHeights } = useMemo(() => {
    return buildMonthLayoutHorizontal(
      shifts,
      year,
      month,
      hourWidth,
      PRINT_LANE_HEIGHT
    );
  }, [shifts, year, month, hourWidth]);

  return (
    <div
      ref={ref}
      className="w-full bg-white rounded border border-slate-200 overflow-hidden"
    >
      {/* Sticky header (im Print nicht zwingend sticky, aber ok) */}
      <div className="bg-white border-b border-slate-200 flex">
        <div
          style={{ width: PRINT_DAY_LABEL_WIDTH, height: PRINT_HEADER_HEIGHT }}
        />
        <div className="flex-1" style={{ height: PRINT_HEADER_HEIGHT }}>
          <div className="pt-2">
            <HourHeaderPrint />
          </div>
        </div>
      </div>

      {/* Rows */}
      <div>
        {days.map((d) => {
          const dayNum = d.getDate();
          const parts = perDay[dayNum] || [];
          const rowHeight = Math.max(
            PRINT_LANE_HEIGHT,
            dayHeights[dayNum] ?? PRINT_LANE_HEIGHT
          );

          return (
            <div key={dayNum} className="flex border-b border-slate-100">
              {/* Day label */}
              <div
                className="bg-white border-r border-slate-200 flex flex-col items-center justify-center"
                style={{ width: PRINT_DAY_LABEL_WIDTH, height: rowHeight }}
              >
                <div className="text-sm font-medium">{dayNum}</div>
                <div className="text-xs text-stone-800">{dayLabel(d)}</div>
              </div>

              {/* Timeline */}
              <div className="relative flex-1" style={{ height: rowHeight }}>
                {/* hour lines */}
                <div className="absolute inset-0 pointer-events-none">
                  {Array.from({ length: 24 }).map((_, h) => (
                    <div
                      key={h}
                      className="absolute top-0 bottom-0 border-l border-slate-100"
                      style={{ left: `${(h / 24) * 100}%` }}
                    />
                  ))}
                </div>

                {/* events */}
                <div className="absolute inset-0">
                  {parts.map((p) => (
                    <MonthClosingShiftPartPrint key={p.id} part={p} />
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

function MonthClosingShiftPartPrint({ part }: { part: ShiftPart }) {
  const { color, code } = useMemo(() => {
    if (part.originalShift.shiftAbsence)
      return {
        color: 'bg-red-50 border-red-700 text-red-700',
        code: 'K',
      };
    if (part.isStamped)
      return {
        color: 'bg-emerald-50 border-emerald-700 text-emerald-700',
        code: part.code ?? 'Schicht',
      };
    return {
      color: 'bg-zinc-100 border-zinc-600 text-zinc-600',
      code: part.code ?? 'Schicht',
    };
  }, [part]);

  return (
    <div
      className={`absolute rounded-md border overflow-hidden ${color}`}
      style={{
        top: part.topPx,
        height: part.heightPx,
        left: `${part.leftPct}%`,
        width: `${part.widthPct}%`,
        opacity: part.isStamped ? 1 : 0.6,
      }}
      title={`${code} ${timeToHuman(part.start)}-${timeToHuman(part.end)}`}
    >
      <div className="px-1.5 text-sm font-semibold truncate">
        {part.originalShift.user.firstName} · {code} ·{' '}
        {Math.round((part.end.getTime() - part.start.getTime()) / 60_000 / 6) /
          10}{' '}
        Std.
      </div>
      <div className="px-1.5 text-sm truncate">
        {timeToHuman(part.start)} - {timeToHuman(part.end)}
      </div>
    </div>
  );
}
