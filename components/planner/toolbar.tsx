import { ShiftCode } from '@/generated/prisma';
import { PlanMode } from '@/hooks/usePlanData';
import { SegmentedControl, Tooltip } from '@mantine/core';
import { HotkeyItem, useHotkeys } from '@mantine/hooks';
import {
  IconBackspace,
  IconPencilPlus,
  IconReplace,
} from '@tabler/icons-react';
import { useState } from 'react';

export default function PlannerToolbar({
  shiftCodes,
  activeCode,
  setActiveCode,
  unsavedCount,
  onSave,
  mode,
  setMode,
}: {
  shiftCodes: ShiftCode[];
  activeCode: ShiftCode | 'K' | 'U';
  setActiveCode: (code: ShiftCode | 'K' | 'U') => void;
  unsavedCount: number;
  onSave: () => void;
  mode: PlanMode;
  setMode: (mode: PlanMode) => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop Dock */}
      <PlannerToolbarDock>
        <PlannerToolbarContent
          shiftCodes={shiftCodes}
          activeCode={activeCode}
          setActiveCode={setActiveCode}
          unsavedCount={unsavedCount}
          onSave={onSave}
          mode={mode}
          setMode={setMode}
        />
      </PlannerToolbarDock>

      {/* Mobile FAB */}
      <PlannerFab onClick={() => setMobileOpen(true)} />

      {/* Mobile Sheet */}
      <PlannerMobileSheet
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      >
        <PlannerToolbarContent
          shiftCodes={shiftCodes}
          activeCode={activeCode}
          setActiveCode={(code) => {
            setActiveCode(code);
            setMobileOpen(false);
          }}
          unsavedCount={unsavedCount}
          onSave={onSave}
          mode={mode}
          setMode={setMode}
        />
      </PlannerMobileSheet>
    </>
  );
}

function PlannerToolbarDock({ children }: { children: React.ReactNode }) {
  return (
    <div className="hidden w-9/12 md:flex fixed bottom-4 left-1/2 -translate-x-1/2 bg-white border border-slate-400 shadow-xl rounded-lg px-4 py-3 z-40 items-center gap-4">
      {children}
    </div>
  );
}

function PlannerFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="md:hidden fixed bottom-4 right-4 bg-slate-900 text-white rounded-full shadow-xl w-14 h-14 flex items-center justify-center text-lg font-semibold z-40"
      onClick={onClick}
    >
      ☰
    </button>
  );
}

function PlannerMobileSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="md:hidden fixed inset-0 z-50 flex flex-col">
      {/* halbtransparentes Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* das eigentliche Panel unten */}
      <div className="relative mt-auto bg-white rounded-t-xl shadow-xl p-4 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium text-slate-700">
            Planer-Aktionen
          </div>
          <button className="text-slate-500 text-sm" onClick={onClose}>
            Schließen
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function PlannerToolbarContent({
  shiftCodes,
  activeCode,
  setActiveCode,
  unsavedCount,
  onSave,
  mode,
  setMode,
}: {
  shiftCodes: ShiftCode[];
  activeCode: ShiftCode | 'K' | 'U';
  setActiveCode: (code: ShiftCode | 'K' | 'U') => void;
  unsavedCount: number;
  onSave: () => void;
  mode: PlanMode;
  setMode: (mode: PlanMode) => void;
}) {
  useHotkeys(
    [
      ...shiftCodes
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((c, idx) => [(idx + 1).toString(), () => setActiveCode(c)]),
      [(shiftCodes.length + 1).toString(), () => setActiveCode('K')],
      [(shiftCodes.length + 2).toString(), () => setActiveCode('U')],
      ['a', () => setMode('CREATE')],
      ['s', () => setMode('UPDATE')],
      ['d', () => setMode('DELETE')],
    ] as HotkeyItem[],
    ['INPUT', 'TEXTAREA']
  );

  function isActive(code: ShiftCode | '' | 'K' | 'U') {
    if (activeCode === 'K') return code === 'K';
    if (activeCode === 'U') return code === 'U';
    return (
      typeof activeCode !== 'string' &&
      typeof code !== 'string' &&
      activeCode.code === code.code
    );
  }

  return (
    <div className="w-full flex flex-col sm:flex-row gap-5 items-center justify-between">
      {/* Quick palette */}
      <SegmentedControl
        value={mode}
        onChange={(v) => setMode(v as PlanMode)}
        radius="md"
        size="md"
        data={[
          {
            value: 'CREATE',
            label: (
              <Tooltip label="Schichten Erstellen">
                <div className="flex items-center justify-center gap-2 p-2">
                  <IconPencilPlus size={24} />
                </div>
              </Tooltip>
            ),
          },
          {
            value: 'UPDATE',
            label: (
              <Tooltip label="Schichten Bearbeiten">
                <div className="flex items-center justify-center gap-2 p-2">
                  <IconReplace size={24} />
                </div>
              </Tooltip>
            ),
          },
          {
            value: 'DELETE',
            label: (
              <Tooltip label="Schichten Löschen">
                <div className="flex items-center justify-center gap-2 p-2">
                  <IconBackspace size={24} />
                </div>
              </Tooltip>
            ),
          },
        ]}
      />
      <div className="flex items-center gap-2">
        {shiftCodes
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((c, idx) => (
            <Tooltip label={c.label}>
              <button
                key={c.id}
                className={`px-3 py-1.5 rounded-xl border shadow-sm shift-code-${
                  c.color
                } ${
                  isActive(c) ? 'ring-2 ring-slate-700 animate-ping-return' : ''
                }`}
                onClick={() => setActiveCode(c)}
                title={`${c.code} - ${c.label}`}
              >
                <div className="flex flex-col gap-1 items-center">
                  <p>{c.code}</p>
                  <div className="bg-slate-100 border border-slate-400 w-6 h-6 flex items-center justify-center rounded-md text-sm text-slate-800">
                    {idx + 1}
                  </div>
                </div>
              </button>
            </Tooltip>
          ))}

        <Tooltip label="Krankheit ein- / austragen">
          <button
            className={`px-3 py-1.5 rounded-xl border shadow-sm bg-rose-100 text-rose-800 ${
              isActive('K') ? 'ring-2 ring-slate-700 animate-ping-return' : ''
            }`}
            onClick={() => setActiveCode('K')}
          >
            <div className="flex flex-col gap-1 items-center">
              <p>K</p>
              <div className="bg-slate-100 border border-slate-400 w-6 h-6 flex items-center justify-center rounded-md text-sm text-slate-800">
                {shiftCodes.length + 1}
              </div>
            </div>
          </button>
        </Tooltip>

        <Tooltip label="Urlaub eintragen">
          <button
            className={`px-3 py-1.5 rounded-xl border shadow-sm bg-lime-100 text-lime-800 ${
              isActive('U') ? 'ring-2 ring-slate-700 animate-ping-return' : ''
            }`}
            onClick={() => setActiveCode('U')}
          >
            <div className="flex flex-col gap-1 items-center">
              <p>U</p>
              <div className="bg-slate-100 border border-slate-400 w-6 h-6 flex items-center justify-center rounded-md text-sm text-slate-800">
                {shiftCodes.length + 2}
              </div>
            </div>
          </button>
        </Tooltip>
      </div>

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
  );
}
