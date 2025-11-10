import { Shift } from '@/generated/prisma';
import { dateTimeToHuman, dateToHuman, timeToHuman } from '@/lib/dates';
import { showError, showInfo, showSuccess } from '@/lib/toast';
import { MonthClosingShift } from '@/pages/management/monthClosing';
import { Button, Card, Group, Modal, Stack, Text } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import axios from 'axios';
import { useState, useMemo } from 'react';

function isDiffDay(a: string | Date | null, b: string | Date | null) {
  if (!a || !b) return false;
  return new Date(a).getDate() !== new Date(b).getDate();
}

export default function MonthClosingBackfillModal({
  opened,
  onClose,
  shift,
  onUpdate,
}: {
  opened: boolean;
  onClose: () => void;
  shift: MonthClosingShift;
  onUpdate: (p: MonthClosingShift, del?: boolean) => void;
}) {
  const getDate = (t: any) => (t ? new Date(t) : null);
  // Mantine DateTimePicker arbeitet mit JS Date (lokal). toISOString() macht daraus UTC.
  const [clockIn, setClockIn] = useState<Date | null>(
    getDate(shift.clockIn || shift.start)
  );
  const [clockOut, setClockOut] = useState<Date | null>(
    getDate(shift.clockOut || shift.end)
  );
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    if (!clockIn || !clockOut) return false;
    return clockIn.getTime() < clockOut.getTime();
  }, [clockIn, clockOut]);

  async function handleSubmit() {
    if (!canSubmit) {
      return showError('Bitte gültige Zeiten wählen (Eintritt vor Austritt).');
    }
    setSubmitting(true);
    try {
      const payload = {
        clockIn: clockIn!.toISOString(),
        clockOut: clockOut!.toISOString(),
      };
      const { data } = await axios.put<Shift>(
        `/api/shifts/${shift.id}`,
        payload
      );
      showSuccess('Zeiten aktualisiert.');
      onUpdate({
        ...shift,
        clockIn: data.clockIn || shift.clockIn,
        clockOut: data.clockOut || shift.clockOut,
      });
      onClose();
    } catch (e: any) {
      showError(
        e?.response?.data?.message ?? 'Antrag konnte nicht erstellt werden.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setSubmitting(true);
    try {
      const { data } = await axios.delete(`/api/shifts/${shift.id}`);
      showInfo('Schicht gelöscht.');
      onUpdate(shift, true);
      onClose();
    } catch (e: any) {
      showError(e?.response?.data?.message ?? 'Fehler beim löschen');
    } finally {
      setSubmitting(false);
    }
  }

  function modClockIn(min: number) {
    setClockIn(
      (ci) => new Date(new Date(ci || shift.start).getTime() + min * 60_000)
    );
  }

  function modClockOut(min: number) {
    setClockOut(
      (co) => new Date(new Date(co || shift.end).getTime() + min * 60_000)
    );
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Stempelzeiten korrigieren / nachtragen"
      centered
      size="lg"
    >
      <Stack gap="md">
        <Card
          withBorder
          radius="md"
          p="sm"
          className="hover:bg-gray-50 transition-colors"
        >
          <Group justify="space-between" wrap="nowrap">
            <div className="min-w-0">
              <div className="font-medium truncate">{shift.user.firstName}</div>
              <div className="font-medium truncate">
                {dateToHuman(shift.start)} · {timeToHuman(shift.start)}-
                {timeToHuman(shift.end)}
              </div>
              {shift.code && (
                <div
                  className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold shift-code-${shift.code.color}`}
                >
                  {shift.code.label}
                </div>
              )}
            </div>
          </Group>
        </Card>

        <div>
          <DateTimePicker
            label="Einstempeln (neu)"
            placeholder="Datum & Uhrzeit"
            value={clockIn}
            onChange={(val) =>
              setClockIn(getDate(val) || getDate(shift.clockIn || shift.start))
            }
            withSeconds={false}
            aria-label="clock-in"
          />
          <Button.Group mt="xs">
            <Button onClick={() => modClockIn(-120)} variant="subtle" c="gray">
              - 2 Std.
            </Button>
            <Button onClick={() => modClockIn(-60)} variant="subtle" c="gray">
              - 1 Std.
            </Button>
            <Button onClick={() => modClockIn(-30)} variant="subtle" c="gray">
              - 30 min
            </Button>
            <Button onClick={() => modClockIn(30)} variant="subtle" c="teal">
              + 30 min
            </Button>
            <Button onClick={() => modClockIn(60)} variant="subtle" c="teal">
              + 1 Std.
            </Button>
            <Button onClick={() => modClockIn(120)} variant="subtle" c="teal">
              + 2 Std.
            </Button>
          </Button.Group>
          {shift.clockIn && (
            <Text size="sm" c="dimmed">
              Check In: {dateTimeToHuman(getDate(shift.clockIn))}
            </Text>
          )}
          {isDiffDay(clockIn, shift.start) && (
            <div className="rounded bg-yellow-50 border border-yellow-600 text-yellow-600 px-3 py-2 w-full mt-3">
              Warnung: Datum weicht ab
            </div>
          )}
        </div>
        <div>
          <DateTimePicker
            label="Ausstempeln (neu)"
            placeholder="Datum & Uhrzeit"
            value={clockOut}
            onChange={(val) =>
              setClockOut(getDate(val) || getDate(shift.clockOut || shift.end))
            }
            withSeconds={false}
            minDate={clockIn ?? undefined}
            aria-label="clock-out"
          />
          <Button.Group mt="xs">
            <Button onClick={() => modClockOut(-120)} variant="subtle" c="gray">
              - 2 Std.
            </Button>
            <Button onClick={() => modClockOut(-60)} variant="subtle" c="gray">
              - 1 Std.
            </Button>
            <Button onClick={() => modClockOut(-30)} variant="subtle" c="gray">
              - 30 min
            </Button>
            <Button onClick={() => modClockOut(30)} variant="subtle" c="teal">
              + 30 min
            </Button>
            <Button onClick={() => modClockOut(60)} variant="subtle" c="teal">
              + 1 Std.
            </Button>
            <Button onClick={() => modClockOut(120)} variant="subtle" c="teal">
              + 2 Std.
            </Button>
          </Button.Group>
          {shift.clockOut && (
            <Text size="sm" c="dimmed">
              Check Out: {dateTimeToHuman(getDate(shift.clockOut))}
            </Text>
          )}
          {isDiffDay(clockOut, shift.end) && (
            <div className="rounded bg-yellow-50 border border-yellow-600 text-yellow-600 px-3 py-2 w-full mt-3">
              Warnung: Datum weicht ab
            </div>
          )}
        </div>

        {!canSubmit && (
          <Text size="xs" c="red">
            Beide Zeiten sind erforderlich. Einstempeln muss vor Austempeln
            liegen.
          </Text>
        )}

        <Group justify="space-between" mt="md">
          <Button
            variant="subtle"
            color="red"
            onClick={handleDelete}
            disabled={submitting}
          >
            Schicht löschen
          </Button>
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose} disabled={submitting}>
              Abbrechen
            </Button>
            <Button
              onClick={handleSubmit}
              loading={submitting}
              disabled={!canSubmit}
            >
              Zeiten speichern
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
