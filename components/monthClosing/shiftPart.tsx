import { timeToHuman } from '@/lib/dates';
import { ShiftPart } from '@/lib/monthClosing';
import { ActionIcon, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconClockEdit } from '@tabler/icons-react';
import MonthClosingBackfillModal from './backfillModal';
import { MonthClosingShift } from '@/pages/management/monthClosing';

export default function MonthClosingShiftPart({
  part,
  onUpdate,
}: {
  part: ShiftPart;
  onUpdate: (p: MonthClosingShift, del?: boolean) => void;
}) {
  const [backfillOpen, { open: openBackfill, close: closeBackfill }] =
    useDisclosure(false);

  return (
    <div
      className={`absolute rounded-md shadow-sm border overflow-hidden ${
        part.isStamped
          ? 'bg-emerald-100 border-emerald-700 text-emerald-700'
          : 'bg-zinc-200 border-zinc-600 text-zinc-600'
      }`}
      style={{
        top: part.topPx,
        height: part.heightPx,
        left: `${part.leftPct}%`,
        width: `${part.widthPct}%`,
        opacity: part.isStamped ? 1 : 0.6,
      }}
      title={`${part.code ?? ''} ${timeToHuman(part.start)}-${timeToHuman(
        part.end
      )}`}
    >
      <div className="px-1.5 py-0.5 text-[11px] font-semibold truncate">
        {part.originalShift.user.firstName}
      </div>
      <div className="px-1.5 py-0.5 text-[11px] font-semibold truncate">
        {part.code ?? 'Schicht'}
      </div>
      <div className="px-1.5 text-[10px] truncate">
        {timeToHuman(part.start)} - {timeToHuman(part.end)}
      </div>

      {part.heightPx > 59 && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
          <Tooltip
            label={part.isStamped ? 'Zeiten korrigieren' : 'Zeiten Nachtragen'}
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
  );
}
