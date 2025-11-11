import { useMemo, useRef, useState } from 'react';
import { ShiftCode } from '@/generated/prisma';
import { showError } from '@/lib/toast';
import { PlanNormalizedMap, buildNormalizedFromData } from '@/lib/planner';

export type ShiftObj = {
  state: 'unchanged' | 'new' | 'updated' | 'deleted';
  id: string;
  code?: ShiftCode | 'U';
  isSick?: boolean;
  clockIn: string | null;
  clockOut: string | null;
};

export type PlanMode = 'CREATE' | 'UPDATE' | 'DELETE';

export function usePlanData(
  shiftCodes: ShiftCode[],
  allowPastWriting?: boolean
) {
  const [data, setData] = useState<Record<string, Array<ShiftObj>>>({});
  const [activeCode, setActiveCode] = useState<ShiftCode | 'K' | 'U'>('U');
  const [isPainting, setIsPainting] = useState(false);
  const [mode, setMode] = useState<PlanMode>('UPDATE');

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
    existingId: string | null | undefined,
    code: string
  ) {
    const k = `${empId}|${y}|${m}|${d}`;
    if (mode === 'DELETE' || code === '') return writeCellDelete(k, existingId);

    const shiftCode = code === 'U' ? (code as 'U') : getShiftCode(code);
    if (shiftCode === undefined) return;

    if (mode === 'CREATE') return writeCellCreate(k, shiftCode);
    if (mode === 'UPDATE') return writeCellUpdate(k, shiftCode, existingId);
  }

  function writeCellCreate(key: string, shiftCode: ShiftCode | 'U') {
    setData((prev) => {
      const existing = prev[key];

      if (!existing) {
        return {
          ...prev,
          [key]: [
            {
              id: `new_shift_${new Date().getTime()}`,
              state: 'new',
              code: shiftCode,
              clockIn: null,
              clockOut: null,
            },
          ],
        };
      } else {
        return {
          ...prev,
          [key]: [
            ...prev[key],
            {
              id: `new_shift_${new Date().getTime()}`,
              state: 'new',
              code: shiftCode,
              clockIn: null,
              clockOut: null,
            },
          ],
        };
      }
    });
  }

  function writeCellUpdate(
    key: string,
    shiftCode: ShiftCode | 'U',
    existingId: string | null | undefined
  ) {
    setData((prev) => {
      const existing = getExistingShiftByKey(key, existingId);

      if (!existing) {
        return {
          ...prev,
          [key]: [
            {
              id: `new_shift_${new Date().getTime()}`,
              state: 'new',
              code: shiftCode,
              clockIn: null,
              clockOut: null,
            },
          ],
        };
      }

      if (existing.state === 'new') {
        return {
          ...prev,
          [key]: prev[key].map((s) =>
            s.id === existingId
              ? {
                  ...existing,
                  code: shiftCode,
                }
              : s
          ),
        };
      }

      if (existing.state === 'deleted') {
        return {
          ...prev,
          [key]: prev[key].map((s) =>
            s.id === existingId
              ? {
                  ...existing,
                  state: 'updated',
                  code: shiftCode,
                }
              : s
          ),
        };
      }

      if (existing.state === 'updated') {
        return {
          ...prev,
          [key]: prev[key].map((s) =>
            s.id === existingId
              ? {
                  ...existing,
                  code: shiftCode,
                }
              : s
          ),
        };
      }

      if (existing.state === 'unchanged') {
        return {
          ...prev,
          [key]: prev[key].map((s) =>
            s.id === existingId
              ? {
                  ...existing,
                  state: 'updated',
                  code: shiftCode,
                }
              : s
          ),
        };
      }
      return prev;
    });
  }

  function writeCellDelete(key: string, existingId: string | null | undefined) {
    setData((prev) => {
      const existing = getExistingShiftByKey(key, existingId);

      if (!existing) {
        return prev;
      }

      if (existing.state === 'new') {
        return { ...prev, [key]: prev[key].filter((s) => s.id !== existingId) };
      }

      if (existing.state === 'deleted') {
        return prev;
      }

      if (existing.state === 'updated') {
        return {
          ...prev,
          [key]: prev[key].map((s) =>
            s.id === existingId
              ? {
                  ...existing,
                  state: 'deleted',
                }
              : s
          ),
        };
      }

      if (existing.state === 'unchanged') {
        return {
          ...prev,
          [key]: prev[key].map((s) =>
            s.id === existingId
              ? {
                  ...existing,
                  state: 'deleted',
                }
              : s
          ),
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
    existingId: string | null | undefined,
    code: string | ShiftCode
  ) {
    const codeStr = typeof code === 'string' ? code : code.code;

    if (isPastDate(y, m, d))
      return warnPastOnce(
        'Vergangene Schichten können nicht bearbeitet werden.'
      );
    if (codeStr === 'K') {
      const cellValue = getExistingShift(empId, y, m, d, existingId);
      if (cellValue === undefined || typeof cellValue.code === 'string') {
        return warnPastOnce(
          'Krankheiten können nur auf bereits geplante Schichten gesetzt werden.'
        );
      }
      toggleSick(empId, y, m, d, existingId);
    } else {
      writeCell(empId, y, m, d, existingId, codeStr);
    }
  }

  function toggleSick(
    empId: string,
    y: number,
    m: number,
    d: number,
    existingId: string | null | undefined
  ) {
    const k = `${empId}|${y}|${m}|${d}`;
    setData((prev) => {
      const existing = getExistingShiftByKey(k, existingId);
      if (!existing) return prev;
      if (existing.isSick) {
        return {
          ...prev,
          [k]: prev[k].map((s) =>
            s.id === existingId
              ? {
                  ...existing,
                  isSick: false,
                  state:
                    existing.state === 'new'
                      ? 'new'
                      : existing.state === 'deleted'
                      ? 'deleted'
                      : 'updated',
                }
              : s
          ),
        };
      } else {
        return {
          ...prev,
          [k]: prev[k].map((s) =>
            s.id === existingId
              ? {
                  ...existing,
                  isSick: true,
                  state:
                    existing.state === 'new'
                      ? 'new'
                      : existing.state === 'deleted'
                      ? 'deleted'
                      : 'updated',
                }
              : s
          ),
        };
      }
    });
  }

  function readCell(
    empId: string,
    y: number,
    m: number,
    d: number
  ): Array<ShiftObj> | undefined {
    const k = `${empId}|${y}|${m}|${d}`;
    return data[k];
  }

  function getExistingShift(
    empId: string,
    y: number,
    m: number,
    d: number,
    existingId: string | null | undefined
  ): ShiftObj | undefined {
    const k = `${empId}|${y}|${m}|${d}`;
    return data[k]?.find((s) => s.id === existingId);
  }

  function getExistingShiftByKey(
    key: string,
    existingId: string | null | undefined
  ): ShiftObj | undefined {
    return data[key]?.find((s) => s.id === existingId);
  }

  function resetBaseFromCurrent() {
    // Remove all 'deleted' entries from data
    setData((prev) => {
      const newData: Record<string, Array<ShiftObj>> = {};
      for (const [k, v] of Object.entries(prev)) {
        newData[k] = [];
        for (const s of v) {
          if (s.state === 'deleted') continue;
          if (s.state === 'updated' || s.state === 'new') {
            newData[k].push({ ...s, state: 'unchanged' });
          } else {
            newData[k].push(s);
          }
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
    mode,
    setMode,
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
