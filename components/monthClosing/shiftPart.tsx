import { timeToHuman } from '@/lib/dates';
import { ShiftPart } from '@/lib/monthClosing';
import { ActionIcon, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconClockEdit } from '@tabler/icons-react';
import MonthClosingBackfillModal from './backfillModal';
import { MonthClosingShift } from '@/pages/management/monthClosing';
import { useMemo } from 'react';

export default function MonthClosingShiftPart({
  part,
  onUpdate,
}: {
  part: ShiftPart;
  onUpdate: (p: MonthClosingShift, del?: boolean) => void;
}) {
  const [backfillOpen, { open: openBackfill, close: closeBackfill }] =
    useDisclosure(false);

  const { color, code, isSick } = useMemo(() => {
    if (part.originalShift.shiftAbsence)
      return {
        color: 'bg-red-50 border-red-700 text-red-700',
        code: 'K',
        isSick: true,
      };
    if (part.isStamped)
      return {
        color: 'bg-emerald-50 border-emerald-700 text-emerald-700',
        code: part.code ?? 'Schicht',
        isSick: false,
      };
    return {
      color: 'bg-zinc-100 border-zinc-600 text-zinc-600',
      code: part.code ?? 'Schicht',
      isSick: false,
    };
  }, [part]);

  return (
    <Tooltip
      label={`${part.originalShift.user.firstName} · ${code} · ${
        Math.round((part.end.getTime() - part.start.getTime()) / 60_000 / 6) /
        10
      } Std. (${timeToHuman(part.start)} - ${timeToHuman(part.end)})`}
    >
      <div
        className={`absolute rounded-md shadow-sm border overflow-hidden ${color}`}
        style={{
          top: part.topPx,
          height: part.heightPx,
          left: part.leftPx ?? 0,
          width: part.widthPx ?? 10,
          opacity: part.isStamped ? 1 : 0.6,
        }}
      >
        <div className="px-1.5 text-sm font-semibold truncate">
          {part.originalShift.user.firstName} · {code} ·{' '}
          {Math.round(
            (part.end.getTime() - part.start.getTime()) / 60_000 / 6
          ) / 10}{' '}
          Std.
        </div>
        <div className="px-1.5 text-xs truncate">
          {timeToHuman(part.start)} - {timeToHuman(part.end)}
        </div>

        {!isSick && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Tooltip
              label={
                part.isStamped ? 'Zeiten korrigieren' : 'Zeiten Nachtragen'
              }
            >
              <ActionIcon
                color={part.isStamped ? 'green' : 'blue'}
                onClick={() => openBackfill()}
              >
                <IconClockEdit />
              </ActionIcon>
            </Tooltip>
          </div>
        )}
        <MonthClosingBackfillModal
          opened={backfillOpen}
          shift={part.originalShift}
          onClose={closeBackfill}
          onUpdate={onUpdate}
        />
      </div>
    </Tooltip>
  );
}
