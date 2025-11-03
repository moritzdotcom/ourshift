import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { Holiday, ShiftCode } from '@/generated/prisma';
import { ApiGetSimpleUsersResponse } from '@/pages/api/users';
import { ApiGetShiftsResponse } from '@/pages/api/shifts';
import ShiftCodeBadge from '@/components/shiftCodes/badge';
import { legendLabel, shiftCodeBadgeContent } from '@/lib/shiftCode';
import { useViewportSize } from '@mantine/hooks';

function isWeekend(dt: Date) {
  return dt.getDay() == 0;
}
function ymdToDate(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function dayLabel(dt: Date) {
  return dt.toLocaleDateString('de-DE', { weekday: 'short' });
}
function fullName(u?: ApiGetSimpleUsersResponse[number]) {
  if (!u) return '';
  const s = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
  return s || u.id;
}
function renderCode(s: ApiGetShiftsResponse[number]) {
  if (s.shiftAbsence?.reason === 'SICKNESS') return 'K';
  if (s.shiftAbsence?.reason === 'VACATION') return 'U';
  return s.code ?? '';
}

export default function PlannerPrintPage() {
  const { query } = useRouter();
  const fromStr = String(query.from ?? '');
  const toStr = String(query.to ?? '');

  const { width: vpWidth } = useViewportSize();

  const from = useMemo(() => (fromStr ? ymdToDate(fromStr) : null), [fromStr]);
  const to = useMemo(() => (toStr ? ymdToDate(toStr) : null), [toStr]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [shiftCodes, setShiftCodes] = useState<ShiftCode[]>([]);
  const [users, setUsers] = useState<ApiGetSimpleUsersResponse>([]);
  const [shifts, setShifts] = useState<ApiGetShiftsResponse>([]);

  // Fetch
  useEffect(() => {
    if (!from || !to) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [{ data: hs }, { data: sc }, { data: emps }, { data: sh }] =
          await Promise.all([
            axios.get<Holiday[]>('/api/holidays'),
            axios.get<ShiftCode[]>('/api/shiftCodes'),
            axios.get<ApiGetSimpleUsersResponse>('/api/users?simple=true'),
            axios.get<ApiGetShiftsResponse>('/api/shifts', {
              params: { from: fromStr, to: toStr },
            }),
          ]);
        setHolidays(hs);
        setShiftCodes(sc);
        setUsers(emps.filter((u) => u.isActive));
        setShifts(sh);
      } catch (e: any) {
        setError(e?.message ?? 'Fehler beim Laden');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [from, to, fromStr, toStr]);

  // Indexierung: userId -> Map(tag -> code)
  const userIds = useMemo(
    () => Array.from(new Set(shifts.map((s) => s.userId))),
    [shifts]
  );
  const byUserDay = useMemo(() => {
    const m = new Map<string, Map<number, Array<ShiftCode | 'K' | 'U' | ''>>>();
    for (const id of userIds) m.set(id, new Map());
    for (const s of shifts) {
      const d = new Date(s.start).getDate();
      const code = renderCode(s);
      const mm = m.get(s.userId)!;
      const prev = mm.get(d);
      mm.set(d, prev ? [...prev, code] : [code]);
    }
    return m;
  }, [shifts, userIds]);

  function findHoliday(iso: string) {
    return holidays.find(
      (h) => new Date(h.date).toISOString().slice(0, 10) === iso
    );
  }

  function renderBgColor(d: Date) {
    if (findHoliday(d.toISOString().slice(0, 10))) return 'bg-yellow-100';
    if (isWeekend(d)) return 'bg-sky-100';
    return 'bg-white';
  }

  // Auto-Print nach Laden
  useEffect(() => {
    if (from && to && !loading && !error) {
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [from, to, loading, error]);

  const monthLabel =
    from &&
    from.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

  const days = useMemo(() => {
    if (!from || !to) return [];
    const arr: Date[] = [];
    for (let d = 1; d <= to.getDate(); d++) {
      arr.push(new Date(from.getFullYear(), from.getMonth(), d, 2));
    }
    return arr;
  }, [from, to]);

  const [firstColWidth, otherColsWidth] = useMemo(() => {
    const longestUser =
      users.map((u) => fullName(u)).sort((a, b) => b.length - a.length)[0]
        ?.length || 0;
    const longestUserWidth = longestUser * 8;
    const otherWidth = Math.floor((vpWidth - longestUserWidth) / days.length);
    console.log(otherWidth);
    return [longestUserWidth, otherWidth];
  }, [days, vpWidth, users]);

  return (
    <div
      className="print-root mx-auto"
      style={{ width: `${firstColWidth + otherColsWidth * days.length}px` }}
    >
      <header className="flex justify-between items-center">
        <div className="text-xl font-medium">Dienstplan - {monthLabel}</div>
        <div className="text-sm">
          Zeitraum: {fromStr} - {toStr}
          <br />
          Erstellt am {new Date().toLocaleDateString('de-DE')}
        </div>
      </header>

      {loading && <div className="text-zinc-600 mx-auto">Lade Daten…</div>}
      {error && <div className="text-red-600">Fehler: {error}</div>}

      {!loading && !error && from && to && (
        <>
          <div className="flex flex-wrap items-center gap-3 text-sm py-3">
            {shiftCodes.map((c) => (
              <div
                key={c.id}
                className={`px-2 py-1 rounded-lg border shift-code-${c.color}`}
              >
                {legendLabel(c)}
              </div>
            ))}
            <div className="px-2 py-1 rounded-lg border bg-rose-100 text-rose-800">
              K: Krank
            </div>
            <div className="px-2 py-1 rounded-lg border bg-lime-100 text-lime-800">
              U: Urlaub
            </div>
            <div className="px-2 py-1 rounded-lg border bg-sky-100 text-sky-800">
              Wochenende
            </div>
            <div className="px-2 py-1 rounded-lg border bg-yellow-100 text-yellow-900">
              Feiertag
            </div>
          </div>
          <div className="border rounded overflow-hidden">
            <div
              className="grid min-h-14"
              style={{
                gridTemplateColumns: `${firstColWidth}px repeat(${days.length}, ${otherColsWidth}px)`,
              }}
            >
              <div className="border-b-2 border-r-2 w-full h-full flex items-center justify-center">
                Mitarbeiter
              </div>
              {days.map((d) => (
                <div
                  key={d.getDate()}
                  className={`flex flex-col items-center justify-center w-full h-full p-1 border-b-2 border-r ${renderBgColor(
                    d
                  )}`}
                >
                  <div className="text-sm font-medium">{d.getDate()}</div>
                  <div className="text-xs text-stone-700">{dayLabel(d)}</div>
                </div>
              ))}
            </div>
            <div>
              {userIds
                .sort((a, b) =>
                  fullName(users.find((u) => u.id === a)).localeCompare(
                    fullName(users.find((u) => u.id === b)),
                    'de'
                  )
                )
                .map((uid) => {
                  const u = users.find((x) => x.id === uid);
                  return (
                    <div
                      key={uid}
                      className="grid min-h-14"
                      style={{
                        gridTemplateColumns: `${firstColWidth}px repeat(${days.length}, ${otherColsWidth}px)`,
                      }}
                    >
                      <div className="flex items-center border-r-2 border-b p-1 text-sm">
                        {fullName(u) || uid}
                      </div>
                      {days.map((d) => {
                        const codes =
                          byUserDay.get(uid)?.get(d.getDate()) ?? null;
                        return (
                          <div
                            className={`${renderBgColor(
                              d
                            )} flex flex-col gap-1 items-center justify-center border-b border-r`}
                            key={`${uid}-${d.getDate()}`}
                          >
                            {codes ? (
                              codes.map((c) => (
                                <ShiftCodeBadge code={c}>
                                  {shiftCodeBadgeContent(c)}
                                </ShiftCodeBadge>
                              ))
                            ) : (
                              <span className="text-stone-400">-</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
            </div>
          </div>
        </>
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
