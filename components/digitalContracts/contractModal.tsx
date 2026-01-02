import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  TextInput,
  NumberInput,
  Group,
  Button,
  Alert,
} from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { DigitalContract } from '@/generated/prisma';
import { dateToHuman, dateToISO } from '@/lib/dates';

function centsToInput(c?: number | null) {
  return c == null ? '' : Math.round(c) / 100;
}
function inputToCents(v: number | string | null) {
  if (v === '' || v == null) return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (Number.isNaN(n)) return null;
  return Math.round(n * 100);
}

export default function ContractModal({
  opened,
  onClose,
  mode,
  initial,
  userId,
  onSubmit,
}: {
  opened: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initial?: Partial<DigitalContract> | null;
  userId: string;
  onSubmit: (payload: Partial<DigitalContract>) => void;
}) {
  const isEdit = mode === 'edit';

  // Defaults (bei Create prefille ich aus initial (aktueller Vertrag) – falls vorhanden)
  const today = dateToISO(new Date());

  const [validFrom, setValidFrom] = useState(
    isEdit ? dateToISO(initial!.validFrom) : today
  );
  const [validUntil, setValidUntil] = useState(
    isEdit ? dateToISO(initial!.validUntil) : ''
  );

  const [salaryMonthly, setSalaryMonthly] = useState<number | ''>(
    centsToInput(initial?.salaryMonthlyCents) || ''
  );
  const [hourlyRate, setHourlyRate] = useState<number | ''>(
    centsToInput(initial?.hourlyRateCents) || ''
  );

  const [vacationDaysAnnual, setVacationDaysAnnual] = useState<number | ''>(
    initial?.vacationDaysAnnual ?? ''
  );
  const [weeklyHours, setWeeklyHours] = useState<number | ''>(
    initial?.weeklyHours ? Number(initial.weeklyHours) : ''
  );

  const [vacationBonus, setVacationBonus] = useState<number | ''>(
    initial?.vacationBonus ?? ''
  );
  const [christmasBonus, setChristmasBonus] = useState<number | ''>(
    initial?.christmasBonus ?? ''
  );

  useEffect(() => {
    if (!opened) return;
    if (isEdit && initial) {
      setValidFrom(dateToISO(initial.validFrom));
      setValidUntil(dateToISO(initial.validUntil));
      setSalaryMonthly(centsToInput(initial.salaryMonthlyCents) || '');
      setHourlyRate(centsToInput(initial.hourlyRateCents) || '');
      setVacationDaysAnnual(initial.vacationDaysAnnual ?? '');
      setWeeklyHours(initial.weeklyHours ? Number(initial.weeklyHours) : '');
      setVacationBonus(initial.vacationBonus ?? '');
      setChristmasBonus(initial.christmasBonus ?? '');
    }
    if (!isEdit && initial) {
      // Create aus aktuellem Vertrag: übernehme Werte, setze validFrom=today, validUntil leer
      setValidFrom(today);
      setValidUntil('');
      setSalaryMonthly(centsToInput(initial.salaryMonthlyCents) || '');
      setHourlyRate(centsToInput(initial.hourlyRateCents) || '');
      setVacationDaysAnnual(initial.vacationDaysAnnual ?? '');
      setWeeklyHours(initial.weeklyHours ? Number(initial.weeklyHours) : '');
      setVacationBonus(initial.vacationBonus ?? '');
      setChristmasBonus(initial.christmasBonus ?? '');
    }
  }, [opened, isEdit, initial, today]);

  const dateError = useMemo(() => {
    if (!validFrom) return 'Bitte „Gültig ab“ setzen.';
    if (validUntil) {
      if (new Date(validUntil) < new Date(validFrom))
        return '„Gültig bis“ darf nicht vor „Gültig ab“ liegen.';
    }
    return null;
  }, [validFrom, validUntil]);

  function handleSave() {
    if (dateError) return;
    onSubmit({
      id: initial?.id,
      userId,
      validFrom: new Date(validFrom),
      validUntil: validUntil ? new Date(validUntil) : null,
      salaryMonthlyCents: inputToCents(salaryMonthly),
      hourlyRateCents: inputToCents(hourlyRate),
      vacationDaysAnnual:
        vacationDaysAnnual === '' ? null : Number(vacationDaysAnnual),
      weeklyHours: weeklyHours === '' ? null : (Number(weeklyHours) as any),
      vacationBonus: vacationBonus === '' ? null : Number(vacationBonus),
      christmasBonus: christmasBonus === '' ? null : Number(christmasBonus),
    });
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        isEdit
          ? 'Aktuellen Vertrag bearbeiten'
          : 'Vertragsbedingungen hinzufügen'
      }
      size="lg"
    >
      <Alert
        variant="light"
        color="blue"
        icon={<IconInfoCircle size={16} />}
        mb="md"
      >
        {isEdit
          ? 'Passe die aktuelle Vereinbarung an (Gültigkeit beachten).'
          : `Neue Vereinbarung ab ${dateToHuman(
              validFrom
            )}; vorhandener Vertrag wird automatisch beendet.`}
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
        <TextInput
          label="Gültig ab"
          type="date"
          value={validFrom}
          onChange={(e) => setValidFrom(e.currentTarget.value)}
          required
        />
        <TextInput
          label="Gültig bis (optional)"
          type="date"
          value={validUntil}
          min={validFrom || undefined}
          onChange={(e) => setValidUntil(e.currentTarget.value)}
        />

        <NumberInput
          label="Monatl. Grundgehalt"
          value={salaryMonthly}
          onChange={(v) => setSalaryMonthly(v as any)}
          step={50}
          min={0}
          decimalSeparator=","
          thousandSeparator="."
          suffix=" €"
        />
        <NumberInput
          label="Stundensatz"
          description={`Berechnet: ${fmtEuro(
            (salaryMonthly || 0) / ((weeklyHours || 0) * (52 / 12))
          )}`}
          value={hourlyRate}
          onChange={(v) => setHourlyRate(v as any)}
          step={0.5}
          min={0}
          decimalSeparator=","
          suffix=" €"
        />

        <NumberInput
          label="Urlaubstage/Jahr"
          value={vacationDaysAnnual}
          onChange={(v) => setVacationDaysAnnual(v as any)}
          step={1}
          min={0}
          decimalSeparator=","
        />
        <NumberInput
          label="Stunden/Woche"
          value={weeklyHours}
          onChange={(v) => setWeeklyHours(v as any)}
          step={0.25}
          min={0}
          decimalSeparator=","
        />

        <NumberInput
          label="Urlaubsgeld"
          description="in % vom Grundgehalt"
          value={vacationBonus}
          onChange={(v) => setVacationBonus(v as any)}
          step={0.5}
          min={0}
          max={500}
          placeholder="50%"
          suffix="%"
          decimalSeparator=","
        />
        <NumberInput
          label="Weihnachtsgeld"
          description="in % vom Grundgehalt"
          value={christmasBonus}
          onChange={(v) => setChristmasBonus(v as any)}
          step={0.5}
          min={0}
          max={500}
          placeholder="50%"
          suffix="%"
          decimalSeparator=","
        />
      </div>

      {dateError && (
        <Alert mt="md" variant="light" color="red">
          {dateError}
        </Alert>
      )}

      <Group justify="end" mt="md">
        <Button variant="default" onClick={onClose}>
          Abbrechen
        </Button>
        <Button onClick={handleSave} disabled={!!dateError}>
          Speichern
        </Button>
      </Group>
    </Modal>
  );
}

function fmtEuro(num: number) {
  if (num == null) return '-';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(num);
}
