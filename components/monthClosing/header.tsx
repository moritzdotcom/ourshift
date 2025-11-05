import { useMonthClosingStats } from '@/hooks/useMonthClosingStats';
import { MonthClosingShift } from '@/pages/management/monthClosing';
import {
  ActionIcon,
  Badge,
  Center,
  Group,
  RingProgress,
  Select,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconCalendar, IconCheck } from '@tabler/icons-react';

export default function MonthClosingHeader({
  shifts,
  year,
  month,
  setYear,
  setMonth,
}: {
  shifts: MonthClosingShift[];
  year: number;
  month: number;
  setYear: (y: number) => void;
  setMonth: (m: number) => void;
}) {
  function monthLabel(y: number, m: number) {
    return new Date(y, m, 1).toLocaleDateString('de', {
      month: 'long',
      year: 'numeric',
    });
  }

  const stats = useMonthClosingStats(shifts);
  return (
    <Group justify="space-between">
      <Group>
        <Stack gap={5}>
          <Title order={2}>Monatsabschluss</Title>
          {stats.toReview === 0 ? (
            <Badge color="teal" leftSection={<IconCheck size={14} />}>
              Monat abgeschlossen
            </Badge>
          ) : (
            <Badge color="yellow">{stats.toReview} Schichten zu prüfen</Badge>
          )}
        </Stack>
        <RingProgress
          label={
            stats.percentageDone == 100 ? (
              <Center>
                <ActionIcon color="teal" variant="light" radius="xl" size="sm">
                  <IconCheck />
                </ActionIcon>
              </Center>
            ) : (
              <Text c="teal" fw={700} ta="center" size="xs">
                {stats.percentageDone}%
              </Text>
            )
          }
          size={60}
          thickness={6}
          roundCaps
          sections={[{ value: stats.percentageDone, color: 'teal' }]}
        />
      </Group>
      <Group>
        {/* Monat/Jahr Auswahl */}
        <Select
          leftSection={<IconCalendar size={16} />}
          value={`${year}-${month}`}
          data={Array.from({ length: 24 }).map((_, i) => {
            const d = new Date();
            d.setDate(15);
            d.setMonth(d.getMonth() - i);
            return {
              value: `${d.getFullYear()}-${d.getMonth()}`,
              label: monthLabel(d.getFullYear(), d.getMonth()),
            };
          })}
          onChange={(val) => {
            if (!val) return;
            const [y, m] = val.split('-').map(Number);
            setYear(y);
            setMonth(m);
          }}
        />
      </Group>
    </Group>
  );
}
