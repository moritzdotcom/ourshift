import { ShiftCode } from '@/generated/prisma';
import { Select } from '@mantine/core';
import { HotkeyItem, useHotkeys } from '@mantine/hooks';
import { IconArrowBigLeft, IconArrowBigRight } from '@tabler/icons-react';

export default function PlannerToolbar({
  shiftCodes,
  activeCode,
  setActiveCode,
  startYear,
  startMonth,
  numMonths,
  setStartYear,
  setStartMonth,
  setNumMonths,
}: {
  shiftCodes: ShiftCode[];
  activeCode: ShiftCode | '' | 'K' | 'U';
  setActiveCode: (code: ShiftCode | '' | 'K' | 'U') => void;
  startYear: number;
  startMonth: number;
  numMonths: number;
  setStartYear: (val: number) => void;
  setStartMonth: (val: number) => void;
  setNumMonths: (val: number) => void;
}) {
  // Hotkeys (1..n = Codes, n+1 = löschen)
  useHotkeys(
    [
      ...shiftCodes
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((c, idx) => [(idx + 1).toString(), () => setActiveCode(c)]),
      [(shiftCodes.length + 1).toString(), () => setActiveCode('K')],
      [(shiftCodes.length + 2).toString(), () => setActiveCode('U')],
      [(shiftCodes.length + 3).toString(), () => setActiveCode('')],
    ] as HotkeyItem[],
    ['INPUT', 'TEXTAREA']
  );

  function isActive(code: ShiftCode | '' | 'K' | 'U') {
    if (activeCode === '') return code === '';
    if (activeCode === 'K') return code === 'K';
    if (activeCode === 'U') return code === 'U';
    return (
      typeof activeCode !== 'string' &&
      typeof code !== 'string' &&
      activeCode.code === code.code
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-4 rounded shadow p-1 bg-white border">
        <button
          className="hover:text-slate-300 text-xl cursor-pointer"
          onClick={() => {
            const d = new Date(startYear, startMonth - 1, 1);
            setStartYear(d.getFullYear());
            setStartMonth(d.getMonth());
          }}
        >
          <IconArrowBigLeft />
        </button>
        <div className="text-xl">
          {new Date(startYear, startMonth, 1).toLocaleDateString('de', {
            month: 'long',
            year: 'numeric',
          })}
        </div>
        <button
          className="hover:text-slate-300 text-xl cursor-pointer"
          onClick={() => {
            const d = new Date(startYear, startMonth + 1, 1);
            setStartYear(d.getFullYear());
            setStartMonth(d.getMonth());
          }}
        >
          <IconArrowBigRight />
        </button>
      </div>
      <Select
        styles={{
          input: {
            border: '1px solid #000',
            borderRadius: '5px',
          },
        }}
        value={numMonths.toString()}
        onChange={(_, opt) => setNumMonths(parseInt(opt.value || '1'))}
        data={[
          { value: '1', label: '1 Monat' },
          { value: '2', label: '2 Monate' },
          { value: '3', label: '3 Monate' },
          { value: '6', label: '6 Monate' },
          { value: '12', label: '1 Jahr' },
        ]}
      />

      {/* Quick palette */}
      <div className="flex items-center gap-2">
        {shiftCodes
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((c, idx) => {
            return (
              <button
                key={c.id}
                className={`px-3 py-1.5 rounded-xl border shadow-sm shift-code-${
                  c.color
                } ${
                  isActive(c) ? 'ring-2 ring-slate-700 animate-ping-return' : ''
                }`}
                onClick={() => setActiveCode(c)}
                title={`${c.code} - ${c.label}`}
              >
                <div className="flex flex-col gap-1 items-center">
                  <p>{c.code}</p>
                  <div className="bg-slate-100 border border-slate-400 w-6 h-6 flex items-center justify-center rounded-md text-sm text-slate-800">
                    {idx + 1}
                  </div>
                </div>
              </button>
            );
          })}

        <button
          className={`px-3 py-1.5 rounded-xl border shadow-sm bg-rose-100 text-rose-800 ${
            isActive('K') ? 'ring-2 ring-slate-700 animate-ping-return' : ''
          }`}
          onClick={() => setActiveCode('K')}
        >
          <div className="flex flex-col gap-1 items-center">
            <p>K</p>
            <div className="bg-slate-100 border border-slate-400 w-6 h-6 flex items-center justify-center rounded-md text-sm text-slate-800">
              {shiftCodes.length + 1}
            </div>
          </div>
        </button>

        <button
          className={`px-3 py-1.5 rounded-xl border shadow-sm bg-lime-100 text-lime-800 ${
            isActive('U') ? 'ring-2 ring-slate-700 animate-ping-return' : ''
          }`}
          onClick={() => setActiveCode('U')}
        >
          <div className="flex flex-col gap-1 items-center">
            <p>U</p>
            <div className="bg-slate-100 border border-slate-400 w-6 h-6 flex items-center justify-center rounded-md text-sm text-slate-800">
              {shiftCodes.length + 2}
            </div>
          </div>
        </button>

        <button
          className={`px-3 py-1.5 rounded-xl border shadow-sm bg-white ${
            isActive('') ? 'ring-2 ring-slate-700 animate-ping-return' : ''
          }`}
          onClick={() => setActiveCode('')}
        >
          <div className="flex flex-col gap-1 items-center">
            <p>Leer</p>
            <div className="bg-slate-100 border border-slate-400 w-6 h-6 flex items-center justify-center rounded-md text-sm text-slate-800">
              {shiftCodes.length + 3}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
