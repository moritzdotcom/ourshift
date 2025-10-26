import { Card, Text } from '@mantine/core';
import PlanDayCell from './dayCell';
import { Holiday, VacationDay } from '@/generated/prisma';
import { MyShift } from '@/pages';

export default function PlanMonthGrid({
  cells,
  holidays,
  shifts,
  vacationDays,
  loading,
}: {
  cells: Array<{ date: Date; inMonth: boolean } | { blank: true }>;
  holidays?: Holiday[];
  shifts: Map<string, MyShift[]>;
  vacationDays: VacationDay[];
  loading: boolean;
}) {
  function holidayFor(date: Date) {
    if (!holidays) return undefined;
    const key = date.toISOString().slice(0, 10);
    return holidays.find(
      (h) => new Date(h.date).toISOString().slice(0, 10) === key
    );
  }

  function isVacationDay(date: Date) {
    const key = date.toLocaleDateString();
    return vacationDays.some((v) => {
      const vDate = new Date(v.date);
      return vDate.toLocaleDateString() === key;
    });
  }

  return (
    <Card withBorder radius="lg" p="md">
      <div className="grid grid-cols-7 gap-2 px-1 pb-2">
        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((w) => (
          <Text key={w} c="dimmed" ta="center" size="sm">
            {w}
          </Text>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {cells.map((c, idx) => {
          if ('blank' in (c as any)) {
            return (
              <div
                key={idx}
                className="min-h-28 rounded-xl border border-dashed border-slate-200 bg-slate-50"
              />
            );
          }
          const d = (c as any).date as Date;
          return (
            <PlanDayCell
              key={idx}
              d={d}
              holiday={holidayFor(d)}
              isVacation={isVacationDay(d)}
              shifts={shifts.get(d.toLocaleDateString()) ?? []}
              loading={loading}
            />
          );
        })}
      </div>
    </Card>
  );
}
