import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Group,
  Loader,
  Paper,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconBeach,
  IconCalendar,
  IconClock,
  IconHeartbeat,
  IconRefresh,
  IconTrendingUp,
} from '@tabler/icons-react';
import { WorkingStatsEntry } from '@/lib/timeAccount';

export default function MyTimeAccountPage() {
  const today = new Date();

  const [year, setYear] = useState<number>(today.getFullYear());
  const [month, setMonth] = useState<number>(today.getMonth());
  const [data, setData] = useState<WorkingStatsEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 24 }).map((_, i) => {
        const d = new Date();
        d.setDate(15);
        d.setMonth(d.getMonth() - i);

        return {
          value: `${d.getFullYear()}-${d.getMonth()}`,
          label: monthLabel(d.getFullYear(), d.getMonth()),
        };
      }),
    [],
  );

  async function fetchData(recalc?: boolean) {
    try {
      setError(null);

      if (recalc) {
        setRecalculating(true);
      } else {
        setLoading(true);
      }

      const { data } = await axios.get<WorkingStatsEntry>(
        '/api/users/timeAccount/my',
        {
          params: {
            year,
            month,
            recalc,
          },
        },
      );

      setData(data);
    } catch (err) {
      console.error(err);
      setError(
        'Dein Arbeitszeitkonto konnte gerade nicht geladen werden. Bitte versuche es später erneut.',
      );
    } finally {
      setLoading(false);
      setRecalculating(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [year, month]);

  const monthProgress =
    data && data.mHoursPlan > 0
      ? Math.min(100, Math.round((data.mHours / data.mHoursPlan) * 100))
      : 0;

  const yearProgress =
    data && data.yHoursPlan > 0
      ? Math.min(100, Math.round((data.yHours / data.yHoursPlan) * 100))
      : 0;

  return (
    <Box
      mih="100vh"
      bg="gray.0"
      px={{ base: 'md', sm: 'xl' }}
      py={{ base: 'md', sm: 'xl' }}
    >
      <Stack maw={1100} mx="auto" gap="lg">
        <Button
          component={Link}
          href="/"
          variant="subtle"
          color="gray"
          leftSection={<IconArrowLeft size={16} />}
          w="fit-content"
        >
          Zur Startseite
        </Button>

        <Paper withBorder radius="xl" p={{ base: 'md', sm: 'xl' }} bg="white">
          <Group justify="space-between" align="flex-start" gap="md">
            <Stack gap={4}>
              <Title order={2}>Dein Arbeitszeitkonto</Title>

              <Text c="dimmed">
                Hier siehst du deine Stunden, Überstunden, Urlaubstage und
                Kranktage für den ausgewählten Monat.
              </Text>
            </Stack>

            <Group gap="xs">
              <Select
                leftSection={<IconCalendar size={16} />}
                value={`${year}-${month}`}
                data={monthOptions}
                onChange={(val) => {
                  if (!val) return;

                  const [y, m] = val.split('-').map(Number);
                  setYear(y);
                  setMonth(m);
                }}
                w={{ base: '100%', xs: 220 }}
              />

              <Button
                variant="light"
                color="gray"
                onClick={() => fetchData(true)}
                loading={recalculating}
                leftSection={<IconRefresh size={16} />}
              >
                Neu berechnen
              </Button>
            </Group>
          </Group>
        </Paper>

        {error && (
          <Alert color="red" variant="light">
            {error}
          </Alert>
        )}

        {loading ? (
          <Group justify="center" py={60}>
            <Loader />
          </Group>
        ) : data ? (
          <>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
              <KpiCard
                icon={<IconClock size={22} />}
                title="Ist Stunden"
                value={`${fmt(data.mHours)} h`}
                subtitle={`Soll: ${fmt(data.mHoursPlan)} h`}
                badge="Monat"
              />

              <KpiCard
                icon={<IconTrendingUp size={22} />}
                title="Überstunden"
                value={`${fmt(data.overtime)} h`}
                subtitle={`Vorjahr: ${fmt(data.overtimePrevYear)} h`}
                badge={data.overtime >= 0 ? 'Plus' : 'Minus'}
                color={data.overtime >= 0 ? 'green' : 'red'}
              />

              <KpiCard
                icon={<IconBeach size={22} />}
                title="Urlaub"
                value={`${fmt(data.yVacation)} Tage`}
                subtitle={`Jahresanspruch: ${fmt(data.yVacationPlan)} Tage`}
                badge="Jahr"
                color="blue"
              />

              <KpiCard
                icon={<IconHeartbeat size={22} />}
                title="Kranktage"
                value={`${fmt(data.ySickDays)} Tage`}
                subtitle={`Diesen Monat: ${fmt(data.mSickDays)} Tage`}
                badge="Jahr"
                color="orange"
              />
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, md: 2 }}>
              <SectionCard title="Stunden im Monat">
                <ProgressBlock
                  label="Ist zu Soll"
                  value={monthProgress}
                  left={`${fmt(data.mHours)} h`}
                  right={`${fmt(data.mHoursPlan)} h`}
                />

                <Divider />

                <InfoRow label="Ist Stunden" value={`${fmt(data.mHours)} h`} />
                <InfoRow
                  label="Soll Stunden"
                  value={`${fmt(data.mHoursPlan)} h`}
                />
                <InfoRow
                  label="Geplante Stunden"
                  value={`${fmt(data.mHoursPlanned)} h`}
                />
              </SectionCard>

              <SectionCard title="Stunden im Jahr">
                <ProgressBlock
                  label="Ist zu Soll"
                  value={yearProgress}
                  left={`${fmt(data.yHours)} h`}
                  right={`${fmt(data.yHoursPlan)} h`}
                />

                <Divider />

                <InfoRow label="Ist Stunden" value={`${fmt(data.yHours)} h`} />
                <InfoRow
                  label="Soll Stunden"
                  value={`${fmt(data.yHoursPlan)} h`}
                />
                <InfoRow
                  label="Geplante Stunden"
                  value={`${fmt(data.yHoursPlanned)} h`}
                />
              </SectionCard>

              <SectionCard title="Überstunden">
                <InfoRow
                  label="Restüberstunden Vorjahr"
                  value={`${fmt(data.overtimePrevYear)} h`}
                  color={data.overtimePrevYear >= 0 ? 'green' : 'red'}
                />

                <InfoRow
                  label="Überstunden Ist"
                  value={`${fmt(data.overtime)} h`}
                  color={data.overtime >= 0 ? 'green' : 'red'}
                />

                <InfoRow
                  label="Überstunden geplant"
                  value={`${fmt(data.overtimePlanned)} h`}
                  color={data.overtimePlanned >= 0 ? 'green' : 'red'}
                />
              </SectionCard>

              <SectionCard title="Urlaub & Krankheit">
                <InfoRow
                  label="Urlaub diesen Monat"
                  value={`${fmt(data.mVacation)} Tage`}
                />

                <InfoRow
                  label="Urlaub im Jahr"
                  value={`${fmt(data.yVacation)} Tage`}
                />

                <InfoRow
                  label="Urlaubsanspruch Jahr"
                  value={`${fmt(data.yVacationPlan)} Tage`}
                />

                <InfoRow
                  label="Resturlaub Vorjahr"
                  value={`${fmt(data.rVacationPrevYear)} Tage`}
                />

                <Divider />

                <InfoRow
                  label="Kranktage Monat"
                  value={`${fmt(data.mSickDays)} Tage`}
                />

                <InfoRow
                  label="Kranktage Jahr"
                  value={`${fmt(data.ySickDays)} Tage`}
                />
              </SectionCard>
            </SimpleGrid>
          </>
        ) : (
          <Paper withBorder radius="lg" p="xl" ta="center">
            <Text c="dimmed">Keine Daten gefunden.</Text>
          </Paper>
        )}
      </Stack>
    </Box>
  );
}

function KpiCard({
  icon,
  title,
  value,
  subtitle,
  badge,
  color = 'grape',
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  badge: string;
  color?: string;
}) {
  return (
    <Card withBorder radius="xl" p="lg" bg="white">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <ThemeIcon size="lg" radius="md" variant="light" color={color}>
            {icon}
          </ThemeIcon>

          <Badge variant="light" color={color}>
            {badge}
          </Badge>
        </Group>

        <Stack gap={2}>
          <Text size="sm" c="dimmed">
            {title}
          </Text>

          <Text fw={800} fz={28} lh={1.1}>
            {value}
          </Text>

          <Text size="sm" c="dimmed">
            {subtitle}
          </Text>
        </Stack>
      </Stack>
    </Card>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Paper withBorder radius="xl" p="lg" bg="white">
      <Stack gap="md">
        <Title order={4}>{title}</Title>
        {children}
      </Stack>
    </Paper>
  );
}

function InfoRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <Group justify="space-between" gap="lg" wrap="nowrap">
      <Text c="dimmed">{label}</Text>

      <Text fw={700} c={color}>
        {value}
      </Text>
    </Group>
  );
}

function ProgressBlock({
  label,
  value,
  left,
  right,
}: {
  label: string;
  value: number;
  left: string;
  right: string;
}) {
  return (
    <Stack gap={6}>
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          {label}
        </Text>

        <Text size="sm" fw={600}>
          {value}%
        </Text>
      </Group>

      <Progress value={value} radius="xl" size="lg" />

      <Group justify="space-between">
        <Text size="xs" c="dimmed">
          Ist: {left}
        </Text>

        <Text size="xs" c="dimmed">
          Soll: {right}
        </Text>
      </Group>
    </Stack>
  );
}

function fmt(n: number) {
  return Intl.NumberFormat('de-DE', {
    maximumFractionDigits: 1,
  }).format(n);
}

function monthLabel(y: number, m: number) {
  return new Date(y, m, 1).toLocaleDateString('de-DE', {
    month: 'long',
    year: 'numeric',
  });
}
