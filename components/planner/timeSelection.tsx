import { Select } from '@mantine/core';
import { IconArrowBigLeft, IconArrowBigRight } from '@tabler/icons-react';

export default function PlannerTimeSelection({
  startYear,
  startMonth,
  numMonths,
  setStartYear,
  setStartMonth,
  setNumMonths,
}: {
  startYear: number;
  startMonth: number;
  numMonths: number;
  setStartYear: (val: number) => void;
  setStartMonth: (val: number) => void;
  setNumMonths: (val: number) => void;
}) {
  return (
    <div className="w-full flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          className="hover:text-slate-400 text-xl cursor-pointer"
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
          className="hover:text-slate-400 text-xl cursor-pointer"
          onClick={() => {
            const d = new Date(startYear, startMonth + 1, 1);
            setStartYear(d.getFullYear());
            setStartMonth(d.getMonth());
          }}
        >
          <IconArrowBigRight />
        </button>
      </div>

      {/* Range select */}
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
    </div>
  );
}
