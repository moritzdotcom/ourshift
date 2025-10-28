import { useMemo, useRef, useState } from 'react';
import { ShiftCode } from '@/generated/prisma';
import { showError } from '@/lib/toast';
import { PlanNormalizedMap, buildNormalizedFromData } from '@/lib/planner';

export type ShiftObj = {
  state: 'unchanged' | 'new' | 'updated' | 'deleted';
  id?: string;
  code?: ShiftCode | 'U';
  isSick?: boolean;
};

export function usePlanData(
  shiftCodes: ShiftCode[],
  allowPastWriting?: boolean
) {
  const [data, setData] = useState<Record<string, ShiftObj>>({});
  const [activeCode, setActiveCode] = useState<ShiftCode | '' | 'K' | 'U'>('');
  const [isPainting, setIsPainting] = useState(false);

  const baseDataRef = useRef<PlanNormalizedMap>({});
  const toastGateRef = useRef(0);

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  function isPastDate(y: number, m: number, d: number) {
    if (allowPastWriting) return false;
    return new Date(y, m, d).getTime() < todayStart;
  }

  function warnPastOnce(msg: string) {
    const now = Date.now();
    if (now - toastGateRef.current > 1200) {
      showError(msg);
      toastGateRef.current = now;
    }
  }

  function getShiftCode(codeStr: string): ShiftCode | undefined {
    return shiftCodes.find((c) => c.code === codeStr);
  }

  function writeCell(
    empId: string,
    y: number,
    m: number,
    d: number,
    code: string
  ) {
    const k = `${empId}|${y}|${m}|${d}`;
    const shiftCode = ['', 'U'].includes(code)
      ? (code as '' | 'U')
      : getShiftCode(code);
    if (shiftCode === undefined) return;

    setData((prev) => {
      const existing = prev[k];

      if (!existing) {
        if (shiftCode === '') return prev;
        return {
          ...prev,
          [k]: {
            state: 'new',
            code: shiftCode,
          },
        };
      }

      if (existing.state === 'new') {
        if (shiftCode === '') {
          const { [k]: _, ...rest } = prev;
          return rest;
        }
        return {
          ...prev,
          [k]: {
            ...existing,
            code: shiftCode,
          },
        };
      }

      if (existing.state === 'deleted') {
        if (shiftCode === '') return prev;
        return {
          ...prev,
          [k]: {
            ...existing,
            state: 'updated',
            code: shiftCode,
          },
        };
      }

      if (existing.state === 'updated') {
        if (shiftCode === '') {
          return {
            ...prev,
            [k]: {
              ...existing,
              state: 'deleted',
            },
          };
        }
        return {
          ...prev,
          [k]: {
            ...existing,
            code: shiftCode,
          },
        };
      }

      if (existing.state === 'unchanged') {
        if (shiftCode === '') {
          return {
            ...prev,
            [k]: {
              ...existing,
              state: 'deleted',
            },
          };
        }
        return {
          ...prev,
          [k]: {
            ...existing,
            state: 'updated',
            code: shiftCode,
          },
        };
      }
      return prev;
    });
  }

  function tryWriteCell(
    empId: string,
    y: number,
    m: number,
    d: number,
    code: string | ShiftCode
  ) {
    const codeStr = typeof code === 'string' ? code : code.code;

    if (isPastDate(y, m, d))
      return warnPastOnce(
        'Vergangene Schichten können nicht bearbeitet werden.'
      );
    if (codeStr === 'K') {
      const cellValue = readCell(empId, y, m, d);
      if (cellValue === undefined || typeof cellValue.code === 'string') {
        return warnPastOnce(
          'Krankheiten können nur auf bereits geplante Schichten gesetzt werden.'
        );
      }
      toggleSick(empId, y, m, d);
    } else {
      writeCell(empId, y, m, d, codeStr);
    }
  }

  function toggleSick(empId: string, y: number, m: number, d: number) {
    const k = `${empId}|${y}|${m}|${d}`;
    setData((prev) => {
      const existing = prev[k];
      if (!existing) return prev;
      if (existing.isSick) {
        return {
          ...prev,
          [k]: {
            ...existing,
            isSick: false,
            state:
              existing.state === 'new'
                ? 'new'
                : existing.state === 'deleted'
                ? 'deleted'
                : 'updated',
          },
        };
      } else {
        return {
          ...prev,
          [k]: {
            ...existing,
            isSick: true,
            state:
              existing.state === 'new'
                ? 'new'
                : existing.state === 'deleted'
                ? 'deleted'
                : 'updated',
          },
        };
      }
    });
  }

  function readCell(
    empId: string,
    y: number,
    m: number,
    d: number
  ): ShiftObj | undefined {
    const k = `${empId}|${y}|${m}|${d}`;
    return data[k];
  }

  function resetBaseFromCurrent() {
    // Remove all 'deleted' entries from data
    setData((prev) => {
      const newData: Record<string, ShiftObj> = {};
      for (const [k, v] of Object.entries(prev)) {
        if (v.state === 'deleted') continue;
        if (v.state === 'updated' || v.state === 'new') {
          newData[k] = { ...v, state: 'unchanged' };
        } else {
          newData[k] = v;
        }
      }
      return newData;
    });
    // Rebuild baseDataRef from current data
    baseDataRef.current = buildNormalizedFromData(data);
  }

  return {
    data,
    setData,
    activeCode,
    setActiveCode,
    isPainting,
    setIsPainting,
    readCell,
    tryWriteCell,
    isPastDate,
    warnPastOnce,
    baseDataRef,
    resetBaseFromCurrent,
  };
}
