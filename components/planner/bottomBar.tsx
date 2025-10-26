import React from 'react';

export default function PlannerBottomBar({
  unsavedCount,
  onSave,
}: {
  unsavedCount: number;
  onSave: () => void;
}) {
  return (
    <div className="sticky bottom-4 left-0 right-0 mx-auto max-w-[1400px] z-40">
      <div className="mx-4 rounded-2xl border shadow-lg bg-white p-3 flex items-center justify-between">
        <div className="text-sm text-slate-600">
          Tipps: Ziehen = mehrere Tage füllen · Alt+Klick = löschen
        </div>
        <div className="flex items-center gap-2">
          <button
            className={`relative px-4 py-2 rounded-xl ${
              unsavedCount
                ? 'bg-sky-600 text-white save-attention'
                : 'bg-slate-900 text-white'
            }`}
            onClick={onSave}
          >
            Speichern
            {unsavedCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-white text-sky-700 text-xs font-semibold rounded-full px-1.5 py-0.5 border">
                {unsavedCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
