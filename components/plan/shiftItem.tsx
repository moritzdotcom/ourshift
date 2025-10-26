import { timeToHuman } from '@/lib/dates';
import {
  Card,
  Group,
  Badge,
  Tooltip,
  Text,
  Button,
  Stack,
} from '@mantine/core';
import { IconAlertCircle, IconCircleCheck } from '@tabler/icons-react';
import ShiftCodeBadge from '../shiftCodes/badge';
import { MyShift } from '@/pages';
import { showError, showSuccess } from '@/lib/toast';
import useShiftAbsence from '@/hooks/useShiftAbsence';

export default function PlanShiftItem({ s }: { s: MyShift }) {
  const isAllDay =
    new Date(s.end).getTime() - new Date(s.start).getTime() ===
      24 * 3600 * 1000 &&
    new Date(s.start).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    }) === '00:00';
  const cr = (s as any).changeRequest as any | null;
  const hasPending = cr && cr.status === 'PENDING';
  const completed = Boolean(s.clockIn && s.clockOut);
  const isUpcoming = !completed && new Date(s.start) > new Date();

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
    <Card withBorder radius="md" p={8} bg="#f8fafc">
      <Group gap={6} align="center" wrap="wrap">
        <Group w="100%" align="center" justify="space-between">
          {s.code ? (
            <ShiftCodeBadge code={shiftAbsence ? 'K' : s.code}>
              {shiftAbsence ? 'Krank' : s.code.label}
            </ShiftCodeBadge>
          ) : (
            <Badge variant="light">Schicht</Badge>
          )}
          {completed && <IconCircleCheck size={16} color="green" />}
        </Group>
        <Text size="xs" c="dimmed" ml={3}>
          {isAllDay || shiftAbsence
            ? 'Ganztägig'
            : `${timeToHuman(s.clockIn ?? s.start)} - ${timeToHuman(
                s.clockOut ?? s.end
              )}`}
        </Text>
        {hasPending && (
          <Tooltip label="Korrekturantrag ausstehend">
            <Badge
              color="yellow"
              leftSection={<IconAlertCircle size={12} />}
              size="xs"
            >
              Pending
            </Badge>
          </Tooltip>
        )}
      </Group>
      {isUpcoming &&
        (shiftAbsence ? (
          <Button
            size="xs"
            variant="subtle"
            color="yellow"
            mt={4}
            onClick={markAsHealthy}
            styles={{ label: { whiteSpace: 'normal' } }}
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
