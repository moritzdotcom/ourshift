import { useState, useMemo } from 'react';
import { Modal, Button, Group, Stack, Text, Card } from '@mantine/core';
import axios from 'axios';
import { showError, showSuccess } from '@/lib/toast';
import { DateTimePicker } from '@mantine/dates';
import { ApiPostChangeRequestResponse } from '@/pages/api/changeRequests';
import { dateTimeToHuman, timeToHuman } from '@/lib/dates';
import { MyShift } from '@/pages';

type Props = {
  opened: boolean;
  onClose: () => void;
  shift: MyShift;
  onCreated?: (cr: ApiPostChangeRequestResponse) => void;
};

function fmtDate(s: string | Date) {
  const d = typeof s === 'string' ? new Date(s) : s;
  return d.toLocaleDateString('de', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

function isDiffDay(a: string | Date | null, b: string | Date | null) {
  if (!a || !b) return false;
  return new Date(a).getDate() !== new Date(b).getDate();
}

export default function TimeChangeRequestModal({
  opened,
  onClose,
  shift,
  onCreated,
}: Props) {
  const getDate = (t: any) => (t ? new Date(t) : null);
  // Mantine DateTimePicker arbeitet mit JS Date (lokal). toISOString() macht daraus UTC.
  const [clockIn, setClockIn] = useState<Date | null>(
    getDate(shift.changeRequest?.clockIn) ||
      getDate(shift.clockIn) ||
      getDate(shift.start)
  );
  const [clockOut, setClockOut] = useState<Date | null>(
    getDate(shift.changeRequest?.clockOut) ||
      getDate(shift.clockOut) ||
      getDate(shift.end)
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
        shiftId: shift.id,
        clockIn: clockIn!.toISOString(),
        clockOut: clockOut!.toISOString(),
      };
      const { data } = await axios.post<ApiPostChangeRequestResponse>(
        '/api/changeRequests',
        payload
      );
      showSuccess('Korrekturantrag erstellt.');
      onCreated?.(data);
      onClose();
    } catch (e: any) {
      showError(
        e?.response?.data?.message ?? 'Antrag konnte nicht erstellt werden.'
      );
    } finally {
      setSubmitting(false);
    }
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
        <Text size="sm" c="dimmed">
          Erstelle einen Korrekturantrag für diese Schicht.
        </Text>

        <Card
          withBorder
          radius="md"
          p="sm"
          className="hover:bg-gray-50 transition-colors"
        >
          <Group justify="space-between" wrap="nowrap">
            <div className="min-w-0">
              <div className="font-medium truncate">
                {fmtDate(shift.start)} · {timeToHuman(shift.start)}-
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
              setClockIn(
                getDate(val) ||
                  getDate(shift.changeRequest?.clockIn) ||
                  getDate(shift.clockIn) ||
                  getDate(shift.start)
              )
            }
            withSeconds={false}
            aria-label="clock-in"
          />
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
              setClockOut(
                getDate(val) ||
                  getDate(shift.changeRequest?.clockOut) ||
                  getDate(shift.clockOut) ||
                  getDate(shift.end)
              )
            }
            withSeconds={false}
            minDate={clockIn ?? undefined}
            aria-label="clock-out"
          />
          {shift.clockOut && (
            <Text size="sm" c="dimmed">
              Check Out: {dateTimeToHuman(getDate(shift.clockOut))}
            </Text>
          )}
          {isDiffDay(clockIn, shift.start) && (
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

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose} disabled={submitting}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            loading={submitting}
            disabled={!canSubmit}
          >
            Antrag senden
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
