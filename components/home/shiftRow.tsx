import useShiftAbsence from '@/hooks/useShiftAbsence';
import { timeToHuman } from '@/lib/dates';
import { showError, showSuccess } from '@/lib/toast';
import { MyShift } from '@/pages';
import { Card, Group, Badge, Button } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import ShiftCodeBadge from '../shiftCodes/badge';

function fmtDate(s: string | Date) {
  const d = typeof s === 'string' ? new Date(s) : s;
  return d.toLocaleDateString('de', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

export default function HomeShiftRow({ s }: { s: MyShift }) {
  const now = new Date();
  const start = new Date(s.start);
  const end = new Date(s.end);
  const status: 'RUNNING' | 'PLANNED' | 'DONE' =
    start <= now && end >= now ? 'RUNNING' : start > now ? 'PLANNED' : 'DONE';

  const isAllDay = start.getHours() == 0 && +end - +start == 86400000;

  const { shiftAbsence, createAbsence, deleteAbsence } = useShiftAbsence(s);

  async function markAsSick() {
    try {
      await createAbsence('SICKNESS');
      showSuccess('Krankmeldung erstellt');
    } catch (error) {
      showError('Fehler beim Erstellen der Krankmeldung');
    }
  }

  async function markAsHealthy() {
    try {
      await deleteAbsence();
      showSuccess('Krankmeldung zurückgezogen');
    } catch (error) {
      showError('Fehler beim Zurückziehen der Krankmeldung');
    }
  }

  return (
    <Card
      withBorder
      radius="md"
      p="sm"
      className="hover:bg-gray-50 transition-colors"
    >
      <Group justify="space-between" wrap="nowrap">
        <div className="min-w-0">
          <div className="font-medium truncate">{fmtDate(s.start)}</div>
          <div className="font-medium truncate">
            {isAllDay || shiftAbsence
              ? ''
              : `${timeToHuman(s.start)}-${timeToHuman(s.end)}`}
          </div>
          {s.code && (
            <ShiftCodeBadge code={shiftAbsence ? 'K' : s.code}>
              {shiftAbsence ? 'Krank' : s.code.label}
            </ShiftCodeBadge>
          )}
        </div>
        <Group gap="xs" wrap="nowrap">
          {status === 'RUNNING' && (
            <Badge color="green" variant="light">
              läuft
            </Badge>
          )}
          {status === 'PLANNED' && <Badge variant="light">geplant</Badge>}
        </Group>
      </Group>
      {status === 'PLANNED' &&
        (shiftAbsence ? (
          <Button
            size="xs"
            variant="subtle"
            color="yellow"
            mt={4}
            onClick={markAsHealthy}
          >
            Krankmeldung zurückziehen
          </Button>
        ) : (
          <Button
            size="xs"
            variant="subtle"
            color="indigo"
            mt={4}
            onClick={markAsSick}
          >
            Krank melden
          </Button>
        ))}
    </Card>
  );
}
