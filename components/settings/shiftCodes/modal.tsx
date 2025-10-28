import React, { useEffect, useState } from 'react';
import { Button, Group, Modal, Switch, TextInput } from '@mantine/core';
import { ShiftCode } from '@/generated/prisma';
import { hhmmToMin, minToHHMM } from '@/lib/dates';
import SwatchGrid from './swatchGrid';

export default function ShiftCodeModal({
  opened,
  onClose,
  initial,
  onCreate,
  onUpdate,
}: {
  opened: boolean;
  onClose: () => void;
  initial?: ShiftCode;
  onCreate: (s: ShiftCode) => void;
  onUpdate: (s: ShiftCode) => void;
}) {
  const [code, setCode] = useState(initial?.code || '');
  const [label, setLabel] = useState(initial?.label || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [descriptionEdited, setDescriptionEdited] = useState(
    Boolean(initial?.description)
  );
  const [start, setStart] = useState(
    minToHHMM(initial?.windowStartMin ?? null)
  );
  const [end, setEnd] = useState(minToHHMM(initial?.windowEndMin ?? null));
  const [selectedColor, setSelectedColor] = useState(initial?.color ?? '');
  const [isWorkingShift, setIsWorkingShift] = useState(
    initial?.isWorkingShift ?? true
  );

  function handleSubmit() {
    if (!code || !label) return;

    const payload = {
      ...initial,
      code,
      label,
      description: description || null,
      windowStartMin: hhmmToMin(start) ?? null,
      windowEndMin: hhmmToMin(end) ?? null,
      color: selectedColor || null,
      isWorkingShift,
    };

    if (initial?.id) onUpdate(payload as ShiftCode);
    else onCreate(payload as ShiftCode);
    onClose();
  }

  // Prefill Description
  useEffect(() => {
    if (descriptionEdited) return;
    setDescription(`${start} - ${end}`);
  }, [start, end, descriptionEdited]);

  // ── Refill wenn initial oder opened wechselt
  useEffect(() => {
    if (!opened) return;
    setCode(initial?.code || '');
    setLabel(initial?.label || '');
    setDescription(initial?.description || '');
    setDescriptionEdited(Boolean(initial?.description));
    setStart(minToHHMM(initial?.windowStartMin ?? null));
    setEnd(minToHHMM(initial?.windowEndMin ?? null));
    setSelectedColor(initial?.color ?? '');
    setIsWorkingShift(initial?.isWorkingShift ?? true);
  }, [opened, initial]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={initial ? 'Schicht-Typ bearbeiten' : 'Schicht-Typ erstellen'}
      size="lg"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <TextInput
          label="Code"
          value={code}
          onChange={(e) => setCode(e.currentTarget.value)}
          placeholder="FD"
          maxLength={5}
          required
        />
        <TextInput
          label="Bezeichnung"
          value={label}
          onChange={(e) => setLabel(e.currentTarget.value)}
          placeholder="Frühdienst"
          required
        />

        <TextInput
          label="Start (HH:MM)"
          type="time"
          value={start}
          onChange={(e) => setStart(e.currentTarget.value)}
        />
        <TextInput
          label="Ende (HH:MM)"
          type="time"
          value={end}
          onChange={(e) => setEnd(e.currentTarget.value)}
        />

        <TextInput
          className="md:col-span-2"
          label="Beschreibung (optional)"
          value={description || ''}
          onChange={(e) => {
            setDescriptionEdited(true);
            setDescription(e.currentTarget.value);
          }}
          placeholder="z. B. 08-16 Uhr"
        />

        <div className="flex items-center md:col-span-2 mt-2">
          <Switch
            label="Zählt als Arbeitszeit"
            description="Deaktivieren für Urlaub, Krankheit oder sonstige Abwesenheiten."
            checked={isWorkingShift}
            onChange={(e) => setIsWorkingShift(e.currentTarget.checked)}
          />
        </div>

        <div className="md:col-span-2">
          <div className="text-sm font-medium mb-1">Farbe</div>
          <SwatchGrid
            value={selectedColor}
            onChange={setSelectedColor}
            sampleText={code || 'FD'}
          />
        </div>
      </div>
      <Group justify="end" mt="md">
        <Button variant="default" onClick={onClose}>
          Abbrechen
        </Button>
        <Button onClick={handleSubmit}>Speichern</Button>
      </Group>
    </Modal>
  );
}
