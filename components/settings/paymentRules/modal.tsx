import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Group,
  Modal,
  TextInput,
  NumberInput,
  Switch,
  MultiSelect,
  Alert,
  Select,
  Text,
  Divider,
} from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { hhmmToMin, minToHHMM, WEEKDAY_OPTIONS } from '@/lib/dates';
import axios from 'axios';
import { ApiGetPayRulesResponse } from '@/pages/api/payRules';
import { showSuccess } from '@/lib/toast';
import { PAY_RULE_PRESETS, PayRulePreset } from '@/lib/payRule';

type UserOption = { id: string; firstName: string; lastName: string };

export default function RuleModal({
  opened,
  onClose,
  initial,
  onSubmit,
  users,
  defaultUserId, // optional: vorauswählen (z. B. wenn aus User-Detail geöffnet)
  mode,
}: {
  opened: boolean;
  onClose: () => void;
  initial?: ApiGetPayRulesResponse[number];
  onSubmit: (rule: ApiGetPayRulesResponse[number]) => void;
  users: UserOption[];
  defaultUserId?: string;
  mode?: 'create' | 'edit'; // nur für den Titel
}) {
  const isEdit = !!initial?.id;
  const userLocked = !!initial?.userId;

  // --- User Select
  const [userId, setUserId] = useState<string>(
    initial?.userId ?? defaultUserId ?? ''
  );

  const userData = useMemo(
    () =>
      users.map((u) => ({
        value: u.id,
        label: `${u.firstName} ${u.lastName}`,
      })),
    [users]
  );

  // --- Rest wie gehabt
  const [name, setName] = useState(initial?.name || '');
  const [start, setStart] = useState(
    minToHHMM(initial?.windowStartMin ?? null)
  );
  const [end, setEnd] = useState(minToHHMM(initial?.windowEndMin ?? null));
  const [days, setDays] = useState<string[]>(
    initial?.daysOfWeek?.map(String) || []
  );
  const [holidayOnly, setHolidayOnly] = useState<boolean>(
    initial?.holidayOnly || false
  );
  const [excludeHolidays, setExcludeHolidays] = useState<boolean>(
    initial?.excludeHolidays || false
  );
  const [percent, setPercent] = useState<number | ''>(
    initial?.percent ? Number(initial.percent as unknown as number) : ''
  );
  const [validFrom, setValidFrom] = useState(
    initial?.validFrom
      ? new Date(initial.validFrom as unknown as string)
          .toISOString()
          .slice(0, 10)
      : ''
  );
  const [validUntil, setValidUntil] = useState(
    initial?.validUntil
      ? new Date(initial.validUntil as unknown as string)
          .toISOString()
          .slice(0, 10)
      : ''
  );
  const [loading, setLoading] = useState(false);

  const overMidnightInfo = useMemo(() => {
    const s = hhmmToMin(start);
    const e = hhmmToMin(end);
    if (s != null && e != null && e < s)
      return 'Hinweis: Fenster geht über Mitternacht';
    return null;
  }, [start, end]);

  const dateError = useMemo(() => {
    if (!validFrom) return 'Bitte „Gültig ab“ setzen.';
    if (validUntil) {
      const vf = new Date(validFrom);
      const vu = new Date(validUntil);
      if (vu < vf) return '„Gültig bis“ darf nicht vor „Gültig ab“ liegen.';
    }
    return null;
  }, [validFrom, validUntil]);

  const userError = useMemo(() => {
    if (!userId && !userLocked) return 'Bitte einen Mitarbeiter auswählen.';
    return null;
  }, [userId, userLocked]);

  function handlePresetSelect(preset?: PayRulePreset) {
    setName(preset?.name || '');
    setStart(minToHHMM(preset?.windowStartMin ?? null));
    setEnd(minToHHMM(preset?.windowEndMin ?? null));
    setDays(preset?.daysOfWeek?.map(String) || []);
    setHolidayOnly(preset?.holidayOnly || false);
    setExcludeHolidays(preset?.excludeHolidays || false);
    setPercent(preset?.percent || '');
  }

  async function handleSubmit() {
    if (dateError || userError) return;
    setLoading(true);

    const payload = {
      userId: userLocked ? (initial!.userId as string) : userId,
      name: name || 'Neue Regel',
      windowStartMin: start ? hhmmToMin(start) : null,
      windowEndMin: end ? hhmmToMin(end) : null,
      daysOfWeek: days.length ? days.map((d) => parseInt(d, 10)) : [],
      holidayOnly,
      excludeHolidays,
      validFrom: new Date(validFrom),
      validUntil: validUntil ? new Date(validUntil) : null,
      percent: percent === '' ? null : (Number(percent) as any),
    };

    const { data } = await axios<ApiGetPayRulesResponse[number]>({
      method: isEdit ? 'PUT' : 'POST',
      url: isEdit ? `/api/payRules/${initial!.id}` : '/api/payRules',
      data: payload,
    });
    showSuccess(isEdit ? 'Änderungen gespeichert' : 'Zuschlag erstellt');

    onSubmit(data);
  }

  // ── Refill wenn initial oder opened wechselt
  useEffect(() => {
    if (!opened) return;
    setUserId(initial?.userId ?? defaultUserId ?? '');
    setName(initial?.name || '');
    setStart(minToHHMM(initial?.windowStartMin ?? null));
    setEnd(minToHHMM(initial?.windowEndMin ?? null));
    setDays(initial?.daysOfWeek?.map(String) || []);
    setHolidayOnly(initial?.holidayOnly || false);
    setExcludeHolidays(initial?.excludeHolidays || false);
    setPercent(
      initial?.percent ? Number(initial.percent as unknown as number) : ''
    );
    setValidFrom(
      initial?.validFrom
        ? new Date(initial.validFrom as unknown as string)
            .toISOString()
            .slice(0, 10)
        : ''
    );
    setValidUntil(
      initial?.validUntil
        ? new Date(initial.validUntil as unknown as string)
            .toISOString()
            .slice(0, 10)
        : ''
    );
  }, [opened, initial]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        mode == 'edit'
          ? 'Zuschlagsregel bearbeiten'
          : 'Zuschlagsregel erstellen'
      }
      size="lg"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* USER SELECT */}
        {userLocked ? (
          <Text c="dimmed" className="md:col-span-2">
            Für: {userData.find(({ value }) => value == userId)?.label}
          </Text>
        ) : (
          <Select
            className="md:col-span-2"
            label="Mitarbeiter"
            data={userData}
            value={userId}
            onChange={(v) => setUserId(v || '')}
            placeholder="Mitarbeiter wählen…"
            searchable
            nothingFoundMessage="Keine Treffer"
            withAsterisk
          />
        )}

        {mode === 'create' && <PresetSelection onSelect={handlePresetSelect} />}

        <TextInput
          label="Name"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="z. B. Werktags 20-24 (25%)"
          required
        />

        <NumberInput
          label="Zuschlag (%)"
          value={percent}
          onChange={(v) => setPercent(v === '' || v === null ? '' : Number(v))}
          step={0.5}
          min={0}
          max={500}
          placeholder="25"
          decimalSeparator=","
        />

        <TextInput
          label="Startzeit (HH:MM)"
          type="time"
          value={start}
          onChange={(e) => setStart(e.currentTarget.value)}
          placeholder="20:00"
        />
        <TextInput
          label="Endzeit (HH:MM)"
          type="time"
          value={end}
          onChange={(e) => setEnd(e.currentTarget.value)}
          placeholder="00:00"
        />

        <MultiSelect
          label="Wochentage"
          data={WEEKDAY_OPTIONS}
          value={days}
          onChange={setDays}
          placeholder="leer = alle"
          searchable
          className="md:col-span-2"
        />

        <div className="flex items-center gap-4 md:col-span-2 my-3">
          <Switch
            checked={holidayOnly}
            onChange={(e) => {
              const checked = e.currentTarget.checked;
              if (checked) setExcludeHolidays(false);
              setHolidayOnly(checked);
            }}
            label="Nur an Feiertagen"
          />
          <Switch
            checked={excludeHolidays}
            onChange={(e) => {
              const checked = e.currentTarget.checked;
              if (checked) setHolidayOnly(false);
              setExcludeHolidays(checked);
            }}
            label="Feiertage ausschließen"
          />
        </div>

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

        {(overMidnightInfo || dateError || userError) && (
          <div className="md:col-span-2">
            {overMidnightInfo && (
              <Alert
                variant="light"
                color="blue"
                title="Info"
                icon={<IconInfoCircle size={16} />}
                mb="sm"
              >
                {overMidnightInfo}
              </Alert>
            )}
            {(dateError || userError) && (
              <Alert variant="light" color="red">
                {dateError || userError}
              </Alert>
            )}
          </div>
        )}
      </div>

      <Group justify="end" mt="md">
        <Button variant="default" onClick={onClose}>
          Abbrechen
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!!dateError || !!userError}
          loading={loading}
        >
          Speichern
        </Button>
      </Group>
    </Modal>
  );
}

function PresetSelection({
  onSelect,
}: {
  onSelect: (preset?: PayRulePreset) => void;
}) {
  const [preset, setPreset] = useState<PayRulePreset>();

  const handleChange = (id: string | null) => {
    const pre = PAY_RULE_PRESETS.find((p) => p.id === id);
    setPreset(pre);
    onSelect(pre);
  };

  return (
    <div className="md:col-span-2 flex flex-col gap-3">
      <Select
        value={preset?.id}
        data={PAY_RULE_PRESETS.map((p) => ({
          value: p.id,
          label: p.name,
        }))}
        placeholder="Vorlage auswählen"
        onChange={handleChange}
      />
      <Divider />
    </div>
  );
}
