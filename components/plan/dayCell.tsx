import { Badge, Group, Skeleton, Text } from '@mantine/core';
import BandText from '../bandText';
import PlanShiftItem from './shiftItem';
import { isSameDay } from '@/lib/plan';
import { Holiday } from '@/generated/prisma';
import { MyShift } from '@/pages';

export default function PlanDayCell({
  d,
  holiday,
  isVacation,
  shifts,
  loading,
}: {
  d: Date;
  holiday?: Holiday;
  isVacation: boolean;
  shifts: MyShift[];
  loading: boolean;
}) {
  const today = new Date();
  const isToday = isSameDay(d, today);

  return (
    <div
      className={`min-h-28 rounded-xl border p-2 flex flex-col gap-1 ${
        holiday ? 'bg-yellow-50' : 'bg-white'
      }`}
      title={holiday?.name}
    >
      <Group justify="space-between" align="center" gap={0}>
        <p
          className={
            'px-2 py-0.5' + (isToday ? ' rounded-md bg-red-500 text-white' : '')
          }
        >
          {d.getDate()}
        </p>
        {holiday && (
          <Badge
            variant="outline"
            color="yellow"
            size="xs"
            className="max-w-[99px] overflow-hidden whitespace-nowrap font-mono"
          >
            <BandText text={holiday.name} />
          </Badge>
        )}
        {isVacation && (
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

      {loading && shifts.length === 0 ? (
        <Skeleton h={20} radius="sm" />
      ) : shifts.length === 0 ? (
        <Text c="dimmed" size="xs">
          —
        </Text>
      ) : (
        <div className="flex flex-col gap-1 flex-grow">
          {shifts.map((s) => (
            <PlanShiftItem key={s.id} s={s} />
          ))}
        </div>
      )}
    </div>
  );
}
