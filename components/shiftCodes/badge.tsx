import { shiftCodeColor } from '@/lib/shiftCode';
import { ReactNode } from 'react';

export default function ShiftCodeBadge({
  code,
  className,
  children,
}: {
  code: { color: string } | '' | 'K' | 'U';
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold ${shiftCodeColor(
        code
      )} ${className}`}
    >
      {children}
    </div>
  );
}
