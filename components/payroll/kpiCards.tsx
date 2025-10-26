import { PayrollRow } from '@/lib/payroll';
import { Grid, Card, Group, Text } from '@mantine/core';
import { IconUsers, IconClock, IconCurrencyEuro } from '@tabler/icons-react';
import { useMemo } from 'react';

function Euro(cents?: number | null) {
  if (!cents) return '—';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

export default function PayrollKpiCards({ rows }: { rows: PayrollRow[] }) {
  const kpi = useMemo(() => {
    const totalHours = rows.reduce((a, r) => a + r.monthMinutes, 0) / 60;
    const totalGross = rows.reduce((a, r) => a + r.grossCents, 0);
    const activeUsers = rows.length;
    return { totalHours, totalGross, activeUsers };
  }, [rows]);

  return (
    <Grid>
      <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
        <Card withBorder radius="lg" p="lg">
          <Group justify="space-between">
            <div>
              <Text size="sm" c="dimmed">
                Aktive Mitarbeiter
              </Text>
              <Text size="xl" fw={700}>
                {kpi.activeUsers}
              </Text>
            </div>
            <IconUsers className="text-blue-500" size={28} />
          </Group>
        </Card>
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
        <Card withBorder radius="lg" p="lg">
          <Group justify="space-between">
            <div>
              <Text size="sm" c="dimmed">
                Gesamtstunden
              </Text>
              <Text size="xl" fw={700}>
                {kpi.totalHours.toFixed(1)} h
              </Text>
            </div>
            <IconClock className="text-green-500" size={28} />
          </Group>
        </Card>
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
        <Card withBorder radius="lg" p="lg">
          <Group justify="space-between">
            <div>
              <Text size="sm" c="dimmed">
                Bruttolohn (Summe)
              </Text>
              <Text size="xl" fw={700}>
                {Euro(kpi.totalGross)}
              </Text>
            </div>
            <IconCurrencyEuro className="text-orange-500" size={28} />
          </Group>
        </Card>
      </Grid.Col>
    </Grid>
  );
}
