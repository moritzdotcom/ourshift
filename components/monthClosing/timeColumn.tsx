export default function MonthClosingTimeColumn({
  marginTop,
  itemHeight,
}: {
  marginTop: number;
  itemHeight: number;
}) {
  return (
    <div className="flex flex-col" style={{ marginTop }}>
      {Array.from({ length: 24 }).map((_, i) => (
        <div
          className="text-stone-400 text-xs flex"
          key={`ts-${i}`}
          style={{ height: itemHeight }}
        >
          <span className="-translate-y-2">
            {i.toString().padStart(2, '0')}:00
          </span>
        </div>
      ))}
    </div>
  );
}
