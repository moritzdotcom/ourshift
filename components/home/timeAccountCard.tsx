import {
  Card,
  Group,
  Stack,
  Text,
  Progress,
  Badge,
  Tooltip,
  Divider,
  Skeleton,
} from '@mantine/core';
import {
  IconClockHour4,
  IconUmbrella,
  IconInfoCircle,
} from '@tabler/icons-react';

type WorkingStatsEntry = {
  user: { id: string; firstName: string; lastName: string };
  mHours: number;
  mHoursPlan: number;
  mHoursPlanned: number;
  yHours: number;
  yHoursPlan: number;
  yHoursPlanned: number;
  overtime: number;
  overtimePlanned: number;
  mVacation: number;
  yVacation: number;
  yVacationPlan: number;
  rVacationPrevYear: number;
  mSickDays: number;
  ySickDays: number;
};

export default function HomeTimeAccountCard({
  entry,
  loading,
}: {
  entry?: WorkingStatsEntry | null;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card withBorder radius="md" p="lg">
        <Stack gap="sm">
          <Skeleton height={18} width="60%" />
          <Skeleton height={28} />
          <Skeleton height={12} />
          <Divider my="sm" />
          <Skeleton height={28} />
          <Skeleton height={12} />
        </Stack>
      </Card>
    );
  }

  if (!entry) return null;

  // Überstunden
  const overtime = entry.overtimePlanned ?? 0; // Stunden, +/-
  const yHoursPlan = entry.yHoursPlan ?? 0;

  // Urlaub
  const totalVacationEntitlement =
    (entry.yVacationPlan ?? 0) + (entry.rVacationPrevYear ?? 0);
  const vacationTaken = entry.yVacation ?? 0;
  const vacationRemaining = totalVacationEntitlement - vacationTaken; // kann < 0 sein
  const vacationProgress =
    totalVacationEntitlement > 0
      ? Math.max(
          0,
          Math.min(100, (vacationTaken / totalVacationEntitlement) * 100)
        )
      : 0;

  const overtimeColor = overtime > 0 ? 'teal' : overtime < 0 ? 'red' : 'gray';
  const vacationColor =
    vacationRemaining > 2 ? 'teal' : vacationRemaining >= 0 ? 'yellow' : 'red';

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="md">
        {/* Überstunden */}
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <IconClockHour4 size={18} />
            <Text fw={600}>Überstunden</Text>
            <Tooltip
              label="Differenz aus Ist- und Sollstunden im laufenden Jahr"
              withArrow
            >
              <IconInfoCircle size={16} style={{ opacity: 0.6 }} />
            </Tooltip>
          </Group>
          <Group gap="xs">
            <Text c={overtimeColor} variant="light">
              {overtime} Std.
            </Text>
          </Group>
        </Group>

        <Progress
          value={
            // Visualisierung: Ist vs. Plan, wenn Plan vorhanden
            Number.isFinite(yHoursPlan) && yHoursPlan !== 0
              ? Math.max(
                  0,
                  Math.min(
                    100,
                    (Math.abs(overtime) / Math.abs(yHoursPlan)) * 100
                  )
                )
              : 0
          }
          color={overtimeColor}
          radius="xl"
          striped
        />

        <Divider my="xs" />

        {/* Urlaub */}
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <IconUmbrella size={18} />
            <Text fw={600}>Resturlaub</Text>
            <Tooltip
              withArrow
              label="Berechnung: Restvorjahr + Jahresanspruch - genommene Tage"
            >
              <IconInfoCircle size={16} style={{ opacity: 0.6 }} />
            </Tooltip>
          </Group>
          <Text c={vacationColor}>
            {vacationRemaining.toFixed(1).replace('.', ',')} Tage
          </Text>
        </Group>

        <Progress value={vacationProgress} color={vacationColor} radius="xl" />
        <Text size="xs" c="dimmed">
          {vacationProgress.toFixed(0)}% des Urlaubsanspruchs verbraucht
        </Text>
      </Stack>
    </Card>
  );
}
