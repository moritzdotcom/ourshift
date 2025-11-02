import { ShiftObj } from '@/hooks/usePlanData';

type CellKey = string; // `${userId}|${y}|${m}|${d}`
export type PlanNormalizedMap = Record<
  CellKey,
  Array<{ id: string; code: string }>
>; // value = codeId oder '' (leer)

export function toNormalizedMap(
  raw: Record<string, Array<ShiftObj>>
): PlanNormalizedMap {
  const out: PlanNormalizedMap = {};

  const getCode = (s: ShiftObj): { id: string; code: string } => {
    if (s.state === 'deleted') return { id: s.id || '', code: '' };
    if (s.isSick) return { id: s.id || '', code: 'K' };
    if (typeof s.code === 'string') return { id: s.id || '', code: s.code };
    return { id: s.id || '', code: s.code?.id ?? '' };
  };

  for (const [k, v] of Object.entries(raw)) {
    out[k] = v.map(getCode).filter(({ id }) => id !== '');
  }
  return out;
}

export function buildNormalizedFromData(
  data: Record<string, Array<ShiftObj>>
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
  changes: Array<{
    fromCodeId: string; // '' = leer
    toCodeId: string; // '' = leer
    type: 'add' | 'remove' | 'update';
  }>;
}> {
  const union = new Set([...Object.keys(base), ...Object.keys(current)]);
  const changes: ReturnType<typeof computeDiff> = [];
  for (const k of union) {
    const [userId, y, m, d] = k.split('|');
    const from = base[k] ?? [];
    const to = current[k] ?? [];

    const u = new Set([...from.map(({ id }) => id), ...to.map(({ id }) => id)]);
    const c = [];
    for (const uid of u) {
      const fromCodeId = from.find(({ id }) => id == uid)?.code || '';
      const toCodeId = to.find(({ id }) => id == uid)?.code || '';
      if (fromCodeId === toCodeId) continue;
      let type: 'add' | 'remove' | 'update' = 'update';
      if (!fromCodeId && toCodeId) type = 'add';
      else if (fromCodeId && !toCodeId) type = 'remove';
      c.push({
        fromCodeId,
        toCodeId,
        type,
      });
    }
    changes.push({
      key: k,
      userId,
      y: parseInt(y, 10),
      m: parseInt(m, 10),
      d: parseInt(d, 10),
      changes: c,
    });
  }
  return changes;
}
