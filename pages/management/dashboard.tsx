import { Card, Grid, Group, Text, Title, Progress } from '@mantine/core';
import {
  IconUsers,
  IconClock,
  IconCurrencyEuro,
  IconBeach,
} from '@tabler/icons-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import useSWR from 'swr';
import axios from 'axios';
import ManagementLayout from '@/layouts/managementLayout';
import { DashboardPayload } from '@/lib/kpiCache/dashboard';
import { useMemo } from 'react';

const fetcher = (url: string) =>
  axios.get<DashboardPayload>(url).then((r) => r.data);

export default function DashboardPage() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const { data: dashboardPayload } = useSWR(
    `/api/dashboard/summary?y=${y}&m=${m}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { summary, hoursByDay, costTrend } = useMemo(
    () =>
      dashboardPayload
        ? dashboardPayload
        : { summary: null, hoursByDay: null, costTrend: null },
    [dashboardPayload]
  );

  return (
    <ManagementLayout>
      <div className="p-6 space-y-6">
        <Group justify="space-between">
          <Title order={2}>Dashboard</Title>
          <Text c="dimmed">
            {now.toLocaleDateString('de-DE', {
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </Group>

        {/* KPI GRID */}
        <Grid grow>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder radius="lg" p="lg" h="100%">
              <Group justify="space-between">
                <div>
                  <Text size="sm" c="dimmed">
                    Aktive Mitarbeiter
                  </Text>
                  <Text size="xl" fw={700}>
                    {summary ? summary.activeEmployees : '—'}
                  </Text>
                </div>
                <IconUsers size={28} className="text-blue-500" />
              </Group>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder radius="lg" p="lg" h="100%">
              <Group justify="space-between">
                <div>
                  <Text size="sm" c="dimmed">
                    Gesamtstunden
                  </Text>
                  <Text size="xl" fw={700}>
                    {summary ? `${summary.totalHours} Std.` : '—'}
                  </Text>
                </div>
                <IconClock size={28} className="text-green-500" />
              </Group>
              <Progress
                mt="sm"
                value={
                  summary
                    ? Math.min(
                        100,
                        Math.round(
                          (summary.totalHours / summary.plannedHours) * 100
                        )
                      )
                    : 0
                }
              />
              <Text size="xs" c="dimmed" mt={4}>
                geplant: {summary ? `${summary.plannedHours} Std.` : '—'}
              </Text>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder radius="lg" p="lg" h="100%">
              <Group justify="space-between">
                <div>
                  <Text size="sm" c="dimmed">
                    Personalkosten
                  </Text>
                  <Text size="xl" fw={700}>
                    {summary
                      ? `€ ${summary.totalCost.toLocaleString('de-DE')}`
                      : '—'}
                  </Text>
                </div>
                <IconCurrencyEuro size={28} className="text-orange-500" />
              </Group>
              <Text size="xs" c="dimmed" mt={4}>
                Monat {now.toLocaleDateString('de-DE', { month: 'short' })}
              </Text>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder radius="lg" p="lg" h="100%">
              <Group justify="space-between">
                <div>
                  <Text size="sm" c="dimmed">
                    Genommene Urlaubstage
                  </Text>
                  <Text size="xl" fw={700}>
                    {summary ? summary.usedVacationDays : '—'} /{' '}
                    {summary ? summary.totalVacationDays : '—'}
                  </Text>
                </div>
                <IconBeach size={28} className="text-red-500" />
              </Group>
              <Text size="xs" c="dimmed" mt={4}>
                Jahr {now.toLocaleDateString('de-DE', { year: 'numeric' })}
              </Text>
            </Card>
          </Grid.Col>
        </Grid>

        {/* CHARTS SECTION */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Card withBorder radius="lg" p="lg">
              <Text size="sm" c="dimmed" mb="xs">
                Arbeitsstunden pro Tag
              </Text>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={hoursByDay ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" /> <YAxis /> <Tooltip />
                  <Bar dataKey="hours" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 5 }}>
            <Card withBorder radius="lg" p="lg">
              <Text size="sm" c="dimmed" mb="xs">
                Kostenentwicklung (letzte 6 Monate)
              </Text>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={costTrend ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="cost"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </Grid.Col>
        </Grid>

        {/* TABLE / LIST – kannst du ebenfalls über API füttern */}
        {/* ... bleibt wie gehabt oder eigener Endpoint /api/dashboard/contract-changes */}
      </div>
    </ManagementLayout>
  );
}
