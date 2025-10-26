import React from 'react';
import { Holiday, ShiftCode } from '@/generated/prisma';
import ShiftCodeBadge from '@/components/shiftCodes/badge';
import { shiftCodeBadgeContent, shiftCodeColor } from '@/lib/shiftCode';
import { ShiftObj } from '@/hooks/usePlanData';
import { Tooltip } from '@mantine/core';

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}
function isWeekend(year: number, monthIndex: number, day: number) {
  const d = new Date(year, monthIndex, day).getDay();
  return d === 0 || d === 6;
}
function keyOf(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
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
  ) => ShiftObj | undefined;
  tryWriteCell: (
    empId: string,
    y: number,
    m: number,
    d: number,
    code: string | ShiftCode
  ) => void;
  isPastDate: (y: number, m: number, d: number) => boolean;
  activeCode: ShiftCode | '' | 'K' | 'U';
  setIsPainting: (v: boolean) => void;
  isPainting: boolean;
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
}: Props) {
  const days = daysInMonth(year, month);
  const headerDates = Array.from({ length: days }, (_, i) => i + 1);
  const today = new Date();

  function findHoliday(iso: string) {
    return holidays.find(
      (h) => new Date(h.date).toISOString().slice(0, 10) === iso
    );
  }

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border overflow-hidden select-none">
      {/* Month header */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b px-4 py-3 flex items-center justify-between">
        <div className="font-semibold">
          {new Date(year, month, 1).toLocaleDateString('de', {
            month: 'long',
            year: 'numeric',
          })}
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
          <div className="sticky left-0 z-10 bg-white border-r p-3 font-medium">
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
          {employees.map((emp) => (
            <React.Fragment key={emp.id}>
              {/* Sticky name cell + row action */}
              <div className="sticky left-0 z-10 bg-white border-t border-r p-2 flex items-center gap-2">
                <Tooltip
                  label={`${emp.vacationDaysTaken}/${emp.vacationDays} Urlaubstage genommen`}
                  withArrow
                >
                  <div className="h-7 w-7 rounded-full bg-slate-100 grid place-content-center text-[11px] font-semibold">
                    {emp.firstName.charAt(0)}
                  </div>
                </Tooltip>
                <div
                  className="truncate font-medium"
                  title={`${emp.firstName} ${emp.lastName}`}
                >
                  {`${emp.firstName} ${emp.lastName}`}
                </div>
                <div className="ml-auto flex items-center gap-1 text-xs text-slate-500">
                  <button
                    className="px-2 py-1 rounded border hover:bg-slate-100"
                    onClick={() => {
                      for (let dd = 1; dd <= days; dd++) {
                        if (!isPastDate(year, month, dd)) {
                          tryWriteCell(emp.id, year, month, dd, '');
                        }
                      }
                    }}
                  >
                    Leeren
                  </button>
                </div>
              </div>

              {/* Day cells */}
              {headerDates.map((d) => {
                const cellValue = readCell(emp.id, year, month, d);
                const { code = '', isSick = false, state } = cellValue || {};
                const weekend = isWeekend(year, month, d);
                const iso = keyOf(year, month, d);
                const holiday = findHoliday(iso);
                const isPast = isPastDate(year, month, d);

                return (
                  <div
                    key={`${emp.id}-${d}`}
                    className={`relative border-t border-l flex items-center justify-center text-sm
                      ${
                        weekend
                          ? 'bg-sky-100'
                          : holiday
                          ? 'bg-yellow-100'
                          : 'bg-white'
                      }
                      ${
                        isPast
                          ? 'opacity-60 cursor-not-allowed'
                          : 'cursor-pointer'
                      }`}
                    onMouseDown={(e) => {
                      if (e.altKey) {
                        tryWriteCell(emp.id, year, month, d, '');
                      } else {
                        setIsPainting(true);
                        tryWriteCell(emp.id, year, month, d, activeCode);
                      }
                    }}
                    onMouseEnter={() => {
                      if (!isPast && isPainting) {
                        tryWriteCell(emp.id, year, month, d, activeCode);
                      }
                    }}
                    onMouseUp={() => setIsPainting(false)}
                    onKeyDown={(e) => {
                      if (isPast) return;
                      if (e.key === 'Backspace')
                        tryWriteCell(emp.id, year, month, d, '');
                    }}
                    tabIndex={0}
                    title={
                      isPast
                        ? 'Vergangene Schicht - nicht bearbeitbar'
                        : code && typeof code === 'string'
                        ? 'U - Urlaub'
                        : code
                        ? `${code.code} - ${code.label}`
                        : 'Klick zum Planen'
                    }
                  >
                    <div className="group w-full h-full flex items-center justify-center">
                      {!isPast && (
                        <div
                          className={`group-hover:block hidden px-2 py-0.5 rounded-md text-xs font-semibold opacity-40 ${shiftCodeColor(
                            activeCode
                          )}`}
                        >
                          {shiftCodeBadgeContent(activeCode)}
                        </div>
                      )}
                      <ShiftCodeBadge
                        code={state === 'deleted' ? '' : isSick ? 'K' : code}
                        className={`animate-ping-return ${
                          !isPast ? 'group-hover:hidden' : ''
                        } ${
                          code === '' || state === 'deleted'
                            ? 'text-gray-300'
                            : ''
                        }`}
                      >
                        {shiftCodeBadgeContent(
                          state === 'deleted' ? '' : isSick ? 'K' : code
                        )}
                      </ShiftCodeBadge>
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
