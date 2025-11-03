import { ShiftCode } from '@/generated/prisma';
import { legendLabel } from '@/lib/shiftCode';

export default function PlannerLegend({
  shiftCodes,
}: {
  shiftCodes: ShiftCode[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {shiftCodes.map((c) => (
        <div
          key={c.id}
          className={`px-2 py-1 rounded-lg border shift-code-${c.color}`}
        >
          {legendLabel(c)}
        </div>
      ))}
      <div className="px-2 py-1 rounded-lg border bg-rose-100 text-rose-800">
        K: Krank
      </div>
      <div className="px-2 py-1 rounded-lg border bg-lime-100 text-lime-800">
        U: Urlaub
      </div>
      <div className="px-2 py-1 rounded-lg border bg-sky-100 text-sky-800">
        Wochenende
      </div>
      <div className="px-2 py-1 rounded-lg border bg-yellow-100 text-yellow-900">
        Feiertag
      </div>
    </div>
  );
}
