import { ChangeStatus } from '@/generated/prisma';
import { minutesBetween, timeToHuman } from '@/lib/dates';
import { MyShift } from '@/pages';
import { Card, Button, Text } from '@mantine/core';
import {
  IconClockCheck,
  IconClock,
  IconClockX,
  IconPencil,
} from '@tabler/icons-react';
import { useMemo } from 'react';

function fmtDate(s: string | Date) {
  const d = typeof s === 'string' ? new Date(s) : s;
  return d.toLocaleDateString('de', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}
function hhmm(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export default function ShiftRowPast({
  s,
  onChangeRequest,
}: {
  s: MyShift;
  onChangeRequest: () => void;
}) {
  const start = new Date(s.start);
  const end = new Date(s.end);
  const workedMin = useMemo(() => {
    const ci = s.clockIn ? new Date(s.clockIn) : start;
    const co = s.clockOut ? new Date(s.clockOut) : end;
    return minutesBetween(ci, co);
  }, [s.clockIn, s.clockOut, s.start, s.end]);

  const timesAvailable = Boolean(s.clockIn || s.clockOut);
  const isAllDay = start.getHours() == 0 && +end - +start == 86400000;

  const changeReqStatusColor = (status: ChangeStatus) => {
    if (status == 'APPROVED') return 'lime';
    if (status == 'PENDING') return 'orange';
    return 'red';
  };

  const changeReqStatusIcon = (status: ChangeStatus) => {
    if (status == 'APPROVED') return <IconClockCheck size={14} />;
    if (status == 'PENDING') return <IconClock size={14} />;
    return <IconClockX size={14} />;
  };

  const changeReqStatusText = (status: ChangeStatus) => {
    if (status == 'APPROVED') return 'Änderung angenommen';
    if (status == 'PENDING') return 'Änderung wird geprüft';
    return 'Änderung abgelehnt';
  };

  return (
    <Card
      withBorder
      radius="md"
      p="sm"
      className="hover:bg-gray-50 transition-colors"
    >
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 sm:gap-0">
        <div className="min-w-0">
          <div className="font-medium truncate">{fmtDate(s.start)}</div>
          <div className="font-medium truncate">
            {isAllDay
              ? 'ganztägig'
              : `${timeToHuman(s.start)}-${timeToHuman(s.end)}`}
          </div>
          <Text size="xs" c="dimmed" my={4}>
            {timesAvailable
              ? `erfasst: ${hhmm(workedMin)}`
              : 'keine Stempelzeiten'}
          </Text>
          {s.code && (
            <div
              className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold shift-code-${s.code.color}`}
            >
              {s.code.label}
            </div>
          )}
        </div>
        {s.code?.isWorkingShift &&
          (s.changeRequest ? (
            <Button
              size="xs"
              w="full"
              variant="light"
              color={changeReqStatusColor(s.changeRequest.status)}
              leftSection={changeReqStatusIcon(s.changeRequest.status)}
              onClick={onChangeRequest}
            >
              {changeReqStatusText(s.changeRequest.status)}
            </Button>
          ) : (
            <Button
              size="xs"
              w="full"
              variant="light"
              leftSection={<IconPencil size={14} />}
              onClick={onChangeRequest}
            >
              {timesAvailable ? 'Zeiten ändern' : 'Zeiten nachtragen'}
            </Button>
          ))}
      </div>
    </Card>
  );
}
