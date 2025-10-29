export default function SwatchGrid({
  value,
  onChange,
  sampleText = 'AB',
}: {
  value?: string;
  onChange: (opt: string) => void;
  sampleText?: string;
}) {
  const COLOR_OPTIONS = [
    'emerald',
    'lime',
    'yellow',
    'orange',
    'rose',
    'purple',
    'indigo',
    'cyan',
    'slate',
    'stone',
    'night',
  ];

  return (
    <div className="grid grid-cols-8 gap-2">
      {COLOR_OPTIONS.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`h-10 rounded flex items-center justify-center text-sm hover:animate-pulse ${
            value === opt ? 'ring-2 ring-sky-500' : ''
          }`}
          title={opt}
        >
          <span className={`px-2 py-0.5 rounded-md shift-code-${opt}`}>
            {sampleText}
          </span>
        </button>
      ))}
    </div>
  );
}
