import { Card, Group, Badge, Skeleton, Text } from '@mantine/core';
import BandText from '../bandText';
import PlanShiftItem from './shiftItem';
import { Holiday, VacationDay } from '@/generated/prisma';
import { isSameDay } from '@/lib/plan';
import { MyShift } from '@/pages';

export default function PlanMobileAgenda({
  monthDays,
  year,
  month,
  holidays,
  shifts,
  vacationDays,
  loading,
}: {
  monthDays: number;
  year: number;
  month: number;
  holidays?: Holiday[];
  shifts: Map<string, MyShift[]>;
  vacationDays: VacationDay[];
  loading: boolean;
}) {
  const today = new Date();
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

  const days: Date[] = [];
  for (let d = 1; d <= monthDays; d++) days.push(new Date(year, month, d, 2));
  return (
    <Card withBorder radius="lg" p="md">
      <div className="flex flex-col gap-3">
        {days.map((d) => {
          const key = d.toLocaleDateString();
          const isToday = isSameDay(d, today);
          const holiday = holidayFor(d);
          const vacation = isVacationDay(d);
          const dayShifts = shifts.get(key) ?? [];

          return (
            <div
              key={key}
              className={`rounded-xl border p-3 ${
                holiday ? 'bg-yellow-50' : 'bg-white'
              }`}
            >
              <Group justify="space-between" align="center" mb={6}>
                <Group gap={8}>
                  <p
                    className={
                      isToday
                        ? 'font-bold px-2 py-0.5 rounded-md bg-red-500 text-white'
                        : 'font-bold '
                    }
                  >
                    {d.getDate()}.{' '}
                    {new Date(year, month).toLocaleDateString('de-DE', {
                      month: 'short',
                    })}
                  </p>
                  <Text c="dimmed" size="xs">
                    {d.toLocaleDateString('de-DE', { weekday: 'short' })}
                  </Text>
                </Group>
                {holiday && (
                  <Badge
                    variant="outline"
                    color="yellow"
                    size="xs"
                    className="max-w-[140px] overflow-hidden whitespace-nowrap"
                  >
                    <BandText text={holiday.name} />
                  </Badge>
                )}
                {vacation && (
                  <Badge
                    variant="outline"
                    color="green"
                    size="xs"
                    className="font-mono"
                  >
                    Urlaub 🏖
                  </Badge>
                )}
              </Group>
              {loading && dayShifts.length === 0 ? (
                <Skeleton h={20} radius="sm" />
              ) : dayShifts.length === 0 ? (
                <Text c="dimmed" size="sm">
                  Keine Schichten
                </Text>
              ) : (
                <div className="flex flex-col gap-2">
                  {dayShifts.map((s) => (
                    <PlanShiftItem key={s.id} s={s} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
