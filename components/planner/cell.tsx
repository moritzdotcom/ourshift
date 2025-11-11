import { Holiday, ShiftCode } from '@/generated/prisma';
import { PlanMode, ShiftObj } from '@/hooks/usePlanData';
import ShiftCodeBadge from '../shiftCodes/badge';
import { shiftCodeBadgeContent, shiftCodeColor } from '@/lib/shiftCode';
import { useMemo } from 'react';
import { Tooltip } from '@mantine/core';
import { timeToHuman } from '@/lib/dates';

export default function PlannerCell({
  weekend,
  holiday,
  isPast,
  cellValues,
  tryWriteCell,
  activeCode,
  setIsPainting,
  isPainting,
  mode,
}: {
  weekend: boolean;
  holiday?: Holiday;
  isPast: boolean;
  cellValues: ShiftObj[] | undefined;
  tryWriteCell: (
    existingId: string | null | undefined,
    code: string | ShiftCode
  ) => void;
  activeCode: ShiftCode | 'K' | 'U';
  setIsPainting: (v: boolean) => void;
  isPainting: boolean;
  mode: PlanMode;
}) {
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.altKey) {
      if (cellValues && cellValues.length === 1)
        tryTryWriteCell(cellValues[0].id, '');
    } else {
      setIsPainting(true);
      if (mode === 'CREATE') {
        tryTryWriteCell(null, activeCode);
      } else if (mode === 'DELETE') {
        if (cellValues && cellValues.length === 1)
          tryTryWriteCell(cellValues[0].id, '');
      } else {
        if ((cellValues && cellValues.length <= 1) || cellValues === undefined)
          tryTryWriteCell(cellValues ? cellValues[0]?.id : null, activeCode);
      }
    }
  };

  const onMouseEnter = () => {
    if (!isPast && isPainting) {
      if (mode === 'CREATE') {
        tryTryWriteCell(null, activeCode);
      } else if (mode === 'DELETE') {
        if (cellValues && cellValues.length === 1)
          tryTryWriteCell(cellValues[0].id, '');
      } else {
        if ((cellValues && cellValues.length <= 1) || cellValues === undefined)
          tryTryWriteCell(cellValues ? cellValues[0]?.id : null, activeCode);
      }
    }
  };
  const onMouseUp = () => setIsPainting(false);

  const bgColor = weekend
    ? 'bg-sky-100'
    : holiday
    ? 'bg-yellow-100'
    : 'bg-white';

  const canCreate = useMemo(() => {
    if (mode !== 'CREATE') return true;
    if (activeCode === 'U') {
      if (!cellValues) return true;
      if (cellValues.find((v) => v.code === 'U')) return false;
    }
    return true;
  }, [mode, activeCode, cellValues]);

  const canUpdate = useMemo(() => {
    if (mode !== 'UPDATE') return true;
    if (activeCode === 'U') {
      if (!cellValues) return true;
      if (cellValues.find((v) => v.code === 'U')) return false;
    }
    return true;
  }, [mode, activeCode, cellValues]);

  const showHoverBadge = useMemo(() => {
    if (isPast) return false;
    if (mode === 'DELETE') return false;
    if (mode === 'CREATE') return canCreate;
    if (mode === 'UPDATE')
      return cellValues === undefined || cellValues.length === 0;
  }, [isPast, mode, cellValues, canCreate]);

  function tryTryWriteCell(
    id: string | null | undefined,
    code: string | ShiftCode
  ) {
    if (canCreate && canUpdate) {
      tryWriteCell(id, code);
    }
  }

  return (
    <div
      className={`relative border-t border-l flex items-center justify-center py-1 min-h-14 text-sm ${bgColor} ${
        isPast ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
      }`}
      onMouseDown={onMouseDown}
      onMouseEnter={() => onMouseEnter()}
      onMouseUp={() => onMouseUp()}
      tabIndex={0}
    >
      <div className="group w-full h-full flex flex-col gap-1 items-center justify-center">
        {cellValues ? (
          cellValues.map((cellValue) => {
            return (
              <ShiftObjectInCell
                key={`${cellValue.id}`}
                cellValue={cellValue}
                isPast={isPast}
                mode={mode}
                activeCode={activeCode}
                tryWriteCell={(id, del) =>
                  tryTryWriteCell(id, del ? '' : activeCode)
                }
              />
            );
          })
        ) : (
          <ShiftCodeBadge
            code=""
            className={`animate-ping-return ${
              !isPast && mode !== 'DELETE' ? 'group-hover:hidden' : ''
            } text-gray-300`}
          >
            {shiftCodeBadgeContent('')}
          </ShiftCodeBadge>
        )}
        {showHoverBadge && <HoverBadge activeCode={activeCode} />}
      </div>
    </div>
  );
}

function HoverBadge({ activeCode }: { activeCode: ShiftCode | 'K' | 'U' }) {
  return (
    <div
      className={`group-hover:block hidden px-2 py-0.5 rounded-md text-xs font-semibold opacity-40 ${shiftCodeColor(
        activeCode
      )}`}
    >
      {shiftCodeBadgeContent(activeCode)}
    </div>
  );
}

function ShiftObjectInCell({
  cellValue,
  isPast,
  mode,
  activeCode,
  tryWriteCell,
}: {
  cellValue: ShiftObj;
  isPast: boolean;
  mode: PlanMode;
  activeCode: ShiftCode | 'K' | 'U';
  tryWriteCell: (existingId: string | undefined | null, del: boolean) => void;
}) {
  const {
    id,
    code = '',
    isSick = false,
    state,
    clockIn,
    clockOut,
  } = cellValue || {};

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.altKey) {
      tryWriteCell(id, true);
    } else {
      if (mode === 'DELETE') {
        tryWriteCell(id, true);
      } else if (mode === 'UPDATE') {
        tryWriteCell(id, false);
      }
    }
  };

  return (
    <Tooltip
      color="gray"
      events={{
        hover: Boolean(clockIn && clockOut),
        focus: Boolean(clockIn && clockOut),
        touch: false,
      }}
      label={`⚠️ Stempelzeiten: ${timeToHuman(
        new Date(clockIn || 0)
      )} - ${timeToHuman(new Date(clockOut || 0))}`}
    >
      <div
        onMouseDown={onMouseDown}
        className="group/item w-full flex justify-center"
      >
        {mode === 'UPDATE' && (
          <div
            className={`group-hover/item:block hidden px-2 py-0.5 rounded-md text-xs font-semibold opacity-40 ${shiftCodeColor(
              activeCode
            )}`}
          >
            {shiftCodeBadgeContent(activeCode)}
          </div>
        )}
        <ShiftCodeBadge
          code={state === 'deleted' ? '' : isSick ? 'K' : code}
          className={`animate-ping-return ${
            !isPast && mode === 'UPDATE' ? 'group-hover/item:hidden' : ''
          } ${
            !isPast && mode === 'DELETE'
              ? 'group-hover/item:line-through group-hover/item:opacity-40'
              : ''
          } ${code === '' || state === 'deleted' ? 'text-gray-300' : ''}`}
        >
          {shiftCodeBadgeContent(
            state === 'deleted' ? '' : isSick ? 'K' : code
          )}
        </ShiftCodeBadge>
      </div>
    </Tooltip>
  );
}
