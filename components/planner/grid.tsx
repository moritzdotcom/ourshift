import { Holiday, ShiftCode } from '@/generated/prisma';
import { PlanMode, ShiftObj } from '@/hooks/usePlanData';
import { ActionIcon, Text, Tooltip } from '@mantine/core';
import PlannerCell from './cell';
import Link from 'next/link';
import { IconPrinter } from '@tabler/icons-react';
import { KpiCacheType } from '@/lib/kpiCache';
import axios from 'axios';
import { WorkingStatsEntry } from '@/lib/timeAccount';
import useSWR from 'swr';
import { Fragment } from 'react';

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}
function isWeekend(year: number, monthIndex: number, day: number) {
  const d = new Date(year, monthIndex, day).getDay();
  return d === 0;
}
function keyOf(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function monthBounds(year: number, month0: number) {
  const from = new Date(year, month0, 1);
  const to = new Date(year, month0 + 1, 0); // letzter Tag des Monats
  return { from, to };
}
function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function numFormat(n: number) {
  return Intl.NumberFormat('de', {
    maximumFractionDigits: 0,
  }).format(n);
}

type Emp = {
  id: string;
  firstName: string;
  lastName: string;
  vacationDays: number;
  vacationDaysTaken: number;
};
type Props = {
  year: number;
  month: number; // 0-based
  employees: Emp[];
  holidays: Holiday[];
  readCell: (
    empId: string,
    y: number,
    m: number,
    d: number
  ) => Array<ShiftObj> | undefined;
  tryWriteCell: (
    empId: string,
    y: number,
    m: number,
    d: number,
    existingId: string | null | undefined,
    code: string | ShiftCode
  ) => void;
  isPastDate: (y: number, m: number, d: number) => boolean;
  activeCode: ShiftCode | 'K' | 'U';
  setIsPainting: (v: boolean) => void;
  isPainting: boolean;
  mode: PlanMode;
};

export default function PlannerGridMonth({
  year,
  month,
  employees,
  holidays,
  readCell,
  tryWriteCell,
  isPastDate,
  activeCode,
  setIsPainting,
  isPainting,
  mode,
}: Props) {
  const days = daysInMonth(year, month);
  const headerDates = Array.from({ length: days }, (_, i) => i + 1);
  const today = new Date();

  const taFetcher = () =>
    axios
      .get<KpiCacheType<'TIMEACCOUNT'>>(`/api/users/timeAccount`, {
        params: { year, month },
      })
      .then((r) => r.data.payload);

  const { data: taData, isLoading } = useSWR<WorkingStatsEntry[]>(
    `/api/shifts/currentShift/${year}/${month}`,
    taFetcher
  );

  function findHoliday(iso: string) {
    return holidays.find(
      (h) => new Date(h.date).toISOString().slice(0, 10) === iso
    );
  }

  const bounds = monthBounds(year, month);

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border overflow-hidden select-none">
      {/* Month header */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b px-4 py-3 flex items-center justify-between">
        <div className="flex gap-3 items-center">
          <div className="font-semibold">
            {new Date(year, month, 1).toLocaleDateString('de', {
              month: 'long',
              year: 'numeric',
            })}
          </div>
          <ActionIcon
            component={Link}
            href={`/management/planner/print?from=${toYMD(
              bounds.from
            )}&to=${toYMD(bounds.to)}`}
            variant="subtle"
            size="lg"
          >
            <IconPrinter />
          </ActionIcon>
        </div>
        <div className="text-sm text-slate-500">
          Zum Planen: Klick = Eintragen · Alt+Klick = Löschen · Maus ziehen =
          Malen
        </div>
      </div>

      <div className="overflow-auto">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `280px repeat(${days}, minmax(44px, 1fr))`,
          }}
        >
          {/* Corner */}
          <div className="sticky left-0 z-10 bg-white border-r p-3 border-b font-medium flex items-center">
            Mitarbeiter
          </div>

          {/* Day header cells */}
          {headerDates.map((d) => {
            const dateObj = new Date(year, month, d);
            const weekend = isWeekend(year, month, d);
            const iso = keyOf(year, month, d);
            const holiday = findHoliday(iso);
            const isToday =
              iso ===
              keyOf(today.getFullYear(), today.getMonth(), today.getDate());
            return (
              <div
                key={d}
                className={`text-center p-2 border-b border-l ${
                  weekend
                    ? 'bg-sky-100'
                    : holiday
                    ? 'bg-yellow-100'
                    : 'bg-white'
                }`}
                title={holiday ? holiday.name : undefined}
              >
                <div className="text-xs text-slate-500">
                  {dateObj.toLocaleDateString('de', { weekday: 'short' })}
                </div>
                <div
                  className={`font-semibold ${
                    isToday ? 'bg-red-500 text-white rounded-lg' : ''
                  }`}
                >
                  {d}
                </div>
              </div>
            );
          })}

          {/* Rows */}
          {employees.map((emp) => {
            const empTaData = taData?.find((d) => d.user.id === emp.id);
            return (
              <Fragment key={emp.id}>
                {/* Sticky name cell + row action */}
                <div className="sticky left-0 z-10 bg-white border-t border-r p-2 flex flex-col gap-1 justify-between">
                  <div className="flex items-center h-full gap-2">
                    <div className="h-7 w-7 rounded-full bg-slate-100 grid place-content-center text-[11px] font-semibold">
                      {emp.firstName.charAt(0)}
                    </div>
                    <div
                      className="truncate font-medium"
                      title={`${emp.firstName} ${emp.lastName}`}
                    >
                      {`${emp.firstName} ${emp.lastName}`}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 items-center gap-3">
                    <Tooltip label="Urlaubstage">
                      <Text
                        size="xs"
                        c="dimmed"
                        className={isLoading ? 'animate-pulse' : ''}
                      >
                        UT:{' '}
                        {empTaData
                          ? `${empTaData.yVacation}/${empTaData.yVacationPlan}`
                          : '...'}
                      </Text>
                    </Tooltip>
                    <Tooltip label="Ist-Stunden/Soll-Stunden Monat">
                      <Text
                        size="xs"
                        c="dimmed"
                        className={isLoading ? 'animate-pulse' : ''}
                      >
                        STD:{' '}
                        {empTaData
                          ? `${numFormat(empTaData.mHoursPlanned)}/${numFormat(
                              empTaData.mHoursPlan
                            )}`
                          : '...'}
                      </Text>
                    </Tooltip>
                    <Tooltip label="Überstunden">
                      <Text
                        size="xs"
                        c={
                          empTaData
                            ? empTaData.overtimePlanned >= 0
                              ? 'green'
                              : 'red'
                            : 'dimmed'
                        }
                        className={isLoading ? 'animate-pulse' : ''}
                      >
                        ÜS:{' '}
                        {empTaData
                          ? numFormat(empTaData.overtimePlanned)
                          : '...'}
                      </Text>
                    </Tooltip>
                  </div>
                </div>

                {/* Day cells */}
                {headerDates.map((d) => {
                  const weekend = isWeekend(year, month, d);
                  const iso = keyOf(year, month, d);
                  const holiday = findHoliday(iso);
                  const isPast = isPastDate(year, month, d);

                  const cellValues = readCell(emp.id, year, month, d);

                  return (
                    <PlannerCell
                      key={`${emp.id}-${d}`}
                      weekend={weekend}
                      holiday={holiday}
                      isPast={isPast}
                      cellValues={cellValues}
                      tryWriteCell={(id, code) =>
                        tryWriteCell(emp.id, year, month, d, id, code)
                      }
                      activeCode={activeCode}
                      setIsPainting={setIsPainting}
                      isPainting={isPainting}
                      mode={mode}
                    />
                  );
                })}
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
