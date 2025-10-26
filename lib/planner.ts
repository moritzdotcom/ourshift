import { ShiftObj } from '@/hooks/usePlanData';

type CellKey = string; // `${userId}|${y}|${m}|${d}`
export type PlanNormalizedMap = Record<CellKey, string>; // value = codeId oder '' (leer)

export function toNormalizedMap(
  raw: Record<string, ShiftObj>
): PlanNormalizedMap {
  const out: PlanNormalizedMap = {};

  const getCode = (s: ShiftObj): string => {
    if (s.state === 'deleted') return '';
    if (s.isSick) return 'K';
    if (typeof s.code === 'string') return s.code;
    return s.code?.id ?? '';
  };

  for (const [k, v] of Object.entries(raw)) {
    out[k] = getCode(v);
  }
  return out;
}

export function buildNormalizedFromData(
  data: Record<string, ShiftObj>
): PlanNormalizedMap {
  return toNormalizedMap(data);
}

export function computeDiff(
  base: PlanNormalizedMap,
  current: PlanNormalizedMap
): Array<{
  key: CellKey;
  userId: string;
  y: number;
  m: number;
  d: number;
  fromCodeId: string; // '' = leer
  toCodeId: string; // '' = leer
  type: 'add' | 'remove' | 'update';
}> {
  const union = new Set([...Object.keys(base), ...Object.keys(current)]);
  const changes: ReturnType<typeof computeDiff> = [];
  for (const k of union) {
    const [userId, y, m, d] = k.split('|');
    const fromCodeId = base[k] ?? '';
    const toCodeId = current[k] ?? '';
    if (fromCodeId === toCodeId) continue;
    let type: 'add' | 'remove' | 'update' = 'update';
    if (!fromCodeId && toCodeId) type = 'add';
    else if (fromCodeId && !toCodeId) type = 'remove';
    changes.push({
      key: k,
      userId,
      y: parseInt(y, 10),
      m: parseInt(m, 10),
      d: parseInt(d, 10),
      fromCodeId,
      toCodeId,
      type,
    });
  }
  return changes;
}
