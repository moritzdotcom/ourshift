import { dateTimeToHuman, dateToHuman } from '@/lib/dates';
import { ApiGetChangeRequestResponse } from '@/pages/api/changeRequests';
import {
  Card,
  Stack,
  Group,
  Title,
  Badge,
  Divider,
  Grid,
  Box,
  Button,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconX, IconCheck } from '@tabler/icons-react';
import ShiftCodeBadge from '../shiftCodes/badge';
import DiffRow from './diffRow';
import { ChangeStatus } from '@/generated/prisma';

function StatusBadge({ status }: { status: ChangeStatus }) {
  const color =
    status === 'PENDING' ? 'yellow' : status === 'APPROVED' ? 'green' : 'red';
  const text =
    status === 'PENDING'
      ? 'OFFEN'
      : status === 'APPROVED'
      ? 'GENEHMIGT'
      : 'ABGELEHNT';
  return (
    <Badge color={color} variant="light">
      {text}
    </Badge>
  );
}

export default function ChangeRequestCard({
  cr,
  onAccept,
  onReject,
  busy,
}: {
  cr: ApiGetChangeRequestResponse;
  onAccept: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  busy?: boolean;
}) {
  const s = cr.shift;
  const code = s.code;

  // Alte vs neue Zeiten:
  const oldIn = s.clockIn ?? s.start; // Fallback Start, falls nicht gestempelt
  const oldOut = s.clockOut ?? s.end; // Fallback End, falls nicht gestempelt
  const newIn = cr.clockIn;
  const newOut = cr.clockOut;

  return (
    <Card withBorder radius="lg" shadow="sm">
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <Title order={4}>Antrag vom {dateToHuman(cr.createdAt)}</Title>
            <StatusBadge status={cr.status} />
          </Group>
          {code ? (
            <ShiftCodeBadge code={code}>{code.label}</ShiftCodeBadge>
          ) : (
            <Badge variant="light">Ohne Code</Badge>
          )}
        </Group>

        <Text size="sm" c="dimmed">
          Mitarbeiter:{' '}
          <Text span fw={600}>
            {cr.user.firstName} {cr.user.lastName}
          </Text>
        </Text>

        <Divider my="xs" label="Schicht" />
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Text size="sm">Geplante Schicht</Text>
            <Text mt="xs">
              {dateTimeToHuman(s.start)} - {dateTimeToHuman(s.end)}
            </Text>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Text size="sm">Stempelquellen</Text>
            <Group gap="xs" mt="xs">
              <Badge variant="outline" color="gray">
                in: {s.clockInSource ?? '—'}
              </Badge>
              <Badge variant="outline" color="gray">
                out: {s.clockOutSource ?? '—'}
              </Badge>
            </Group>
          </Grid.Col>
        </Grid>

        <Divider my="xs" label="Änderungen" />
        <Stack gap={6}>
          <DiffRow label="Clock-in" oldValue={oldIn} newValue={newIn} />
          <DiffRow label="Clock-out" oldValue={oldOut} newValue={newOut} />
        </Stack>

        <div className="mt-1 flex flex-col sm:flex-row gap-2 sm:justify-end">
          <Tooltip
            label={
              cr.status !== 'PENDING'
                ? 'Bereits entschieden'
                : 'Antrag ablehnen'
            }
          >
            <Button
              leftSection={<IconX size={16} />}
              variant="outline"
              color="red"
              disabled={cr.status !== 'PENDING' || busy}
              onClick={() => onReject(cr.id)}
            >
              Ablehnen
            </Button>
          </Tooltip>
          <Tooltip
            label={
              cr.status !== 'PENDING'
                ? 'Bereits entschieden'
                : 'Antrag annehmen'
            }
          >
            <Button
              leftSection={<IconCheck size={16} />}
              color="teal"
              disabled={cr.status !== 'PENDING' || busy}
              onClick={() => onAccept(cr.id)}
            >
              Annehmen
            </Button>
          </Tooltip>
        </div>
      </Stack>
    </Card>
  );
}
