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
import { buildMonthLayout } from '@/lib/monthClosing';
import { timeToHuman } from '@/lib/dates';
import { ShiftPart } from '@/lib/monthClosing';
import MonthClosingTimeColumn from '@/components/monthClosing/timeColumn';

const HEADER_HEIGHT = 50;
const HOUR_HEIGHT = 30;

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
          size: A4 landscape;
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

  // Layout-Daten vorbereiten
  const partsByDay = useMemo(() => {
    return buildMonthLayout(shifts, year, month, HEADER_HEIGHT, HOUR_HEIGHT);
  }, [shifts, year, month]);

  return (
    <>
      <div className="flex items-start gap-2 break-after-page">
        {/* linke Zeitspalte */}
        <MonthClosingTimeColumn
          marginTop={HEADER_HEIGHT}
          itemHeight={HOUR_HEIGHT}
        />

        {/* Tages-Spalten */}
        <MonthClosingGridRowPrint
          days={days.slice(0, 15)}
          partsByDay={partsByDay}
        />
      </div>
      <div className="flex items-start gap-2">
        {/* Tages-Spalten */}
        <MonthClosingGridRowPrint
          days={days.slice(15)}
          partsByDay={partsByDay}
        />
        {/* rechte Zeitspalte */}
        <MonthClosingTimeColumn
          marginTop={HEADER_HEIGHT}
          itemHeight={HOUR_HEIGHT}
        />
      </div>
    </>
  );
}

function MonthClosingGridRowPrint({
  days,
  partsByDay,
}: {
  days: Date[];
  partsByDay: Record<number, ShiftPart[]>;
}) {
  const { width: vpWidth } = useViewportSize();

  return (
    <div
      className="grid bg-white rounded"
      style={{
        gridTemplateColumns: `repeat(${days.length}, ${Math.floor(
          (vpWidth - 60) / days.length
        )}px)`,
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
                <MonthClosingShiftPartPrint key={p.id} part={p} />
              ))}
            </div>
          </div>
        );
      })}
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
      className={`absolute rounded-md shadow-sm border overflow-hidden ${color}`}
      style={{
        top: part.topPx,
        height: part.heightPx,
        left: `${part.leftPct}%`,
        width: `${part.widthPct}%`,
        opacity: part.isStamped ? 1 : 0.6,
      }}
      title={`${code} ${timeToHuman(part.start)}-${timeToHuman(part.end)}`}
    >
      <div className="px-1.5 text-[11px] font-semibold truncate">
        {part.originalShift.user.firstName}
      </div>
      <div className="px-1.5 text-[11px] font-semibold truncate">{code}</div>
      <div className="px-1.5 text-[10px] truncate">
        {timeToHuman(part.start)} - {timeToHuman(part.end)}
      </div>
      <div className="px-1.5 text-[10px] truncate">
        {Math.round((part.end.getTime() - part.start.getTime()) / 60_000 / 6) /
          10}{' '}
        Std.
      </div>
    </div>
  );
}
