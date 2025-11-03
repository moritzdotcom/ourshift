import { ShiftCode } from '@/generated/prisma';
import { minToHHMM } from './dates';

export function shiftCodeLabel(
  c: { code: string; label: string } | '' | 'K' | 'U'
) {
  if (c === '') return 'Löschen';
  if (c === 'K') return 'Krank';
  if (c === 'U') return 'Urlaub';
  return `${c.code}: ${c.label}`;
}

export function shiftCodeColor(c: { color: string } | '' | 'K' | 'U') {
  if (c === '') return '';
  if (c === 'K') return 'bg-rose-100 text-rose-800 border-rose-300';
  if (c === 'U') return 'bg-lime-100 text-lime-800 border-lime-300';
  return `shift-code-${c.color}`;
}

export function shiftCodeBadgeContent(c: { code: string } | '' | 'K' | 'U') {
  if (c === '') return '-';
  if (c === 'K') return 'K';
  if (c === 'U') return 'U';
  return c.code;
}

export function legendLabel(code: ShiftCode) {
  let label = `${code.code}: ${code.label}`;
  if (code.windowStartMin && code.windowEndMin) {
    return `${label} (${minToHHMM(code.windowStartMin)} - ${minToHHMM(
      code.windowEndMin
    )})`;
  }
  return label;
}
