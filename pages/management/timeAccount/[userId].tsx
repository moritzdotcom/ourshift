import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import {
  Group,
  Loader,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { IconUser, IconCalendar } from '@tabler/icons-react';
import ManagementLayout from '@/layouts/managementLayout';
import { ApiGetSimpleUsersResponse } from '@/pages/api/users';
import { ApiUserTimeAccountResponse } from '@/pages/api/users/[userId]/timeAccount';

const monthLabelsShort = [
  'Jan',
  'Feb',
  'Mär',
  'Apr',
  'Mai',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Okt',
  'Nov',
  'Dez',
];

const fmt = (n: number) =>
  Intl.NumberFormat('de', { maximumFractionDigits: 1 }).format(n);

export default function TimeAccountUserPage() {
  const router = useRouter();
  const { userId: userIdFromRoute } = router.query;

  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<ApiGetSimpleUsersResponse>([]);
  const [data, setData] = useState<ApiUserTimeAccountResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // User-Liste holen (z. B. für Dropdown)
  useEffect(() => {
    async function fetchUsers() {
      const { data } = await axios.get<ApiGetSimpleUsersResponse>(
        '/api/users?simple=true'
      );
      setUsers(data);
    }
    fetchUsers();
  }, []);

  // userId aus Route in lokalen State übernehmen
  useEffect(() => {
    if (typeof userIdFromRoute === 'string') {
      setSelectedUserId(userIdFromRoute);
    }
  }, [userIdFromRoute]);

  // Detaildaten laden
  useEffect(() => {
    if (!selectedUserId) return;
    async function fetchDetail() {
      setLoading(true);
      try {
        const { data } = await axios.get<ApiUserTimeAccountResponse>(
          `/api/users/${selectedUserId}/timeAccount`, // <-- Endpoint anpassen
          {
            params: { year },
          }
        );
        setData(data);
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [selectedUserId, year]);

  const currentUserName = useMemo(() => {
    if (!data?.user) return '';
    return `${data.user.firstName} ${data.user.lastName}`;
  }, [data]);

  // Tabellen-Konfiguration: Zeilen
  const rowsConfig = [
    {
      key: 'totalHours' as const,
      label: 'Ist Stunden',
      type: 'hours',
    },
    {
      key: 'plannedHours' as const,
      label: 'Soll Stunden',
      type: 'hours',
    },
    {
      key: 'overtime' as const,
      label: 'Überstunden',
      type: 'hours',
    },
    {
      key: 'totalVacation' as const,
      label: 'Urlaub Ist',
      type: 'days',
    },
    {
      key: 'plannedVacation' as const,
      label: 'Urlaub Soll',
      type: 'days',
    },
    {
      key: 'sickDays' as const,
      label: 'Krankentage',
      type: 'days',
    },
  ];

  const yearOptions = useMemo(
    () =>
      Array.from({ length: 5 }).map((_, i) => {
        const y = new Date().getFullYear() - i;
        return { value: String(y), label: String(y) };
      }),
    []
  );

  const userOptions = useMemo(
    () =>
      users.map((u) => ({
        value: u.id,
        label: `${u.firstName} ${u.lastName}`,
      })),
    [users]
  );

  // Helper um Monatsdaten zu finden
  function getMonthValue(
    monthIndex: number,
    key:
      | 'totalHours'
      | 'plannedHours'
      | 'overtime'
      | 'totalVacation'
      | 'plannedVacation'
      | 'sickDays'
  ) {
    const m = data?.monthlyData.find((m) => m.month === monthIndex);
    if (!m) return 0;
    return m[key];
  }

  function getManualAdjustment(key: (typeof rowsConfig)[number]['key']) {
    if (!data) return 0;
    // Hier kannst du je nach Logik unterscheiden

    return 0;
  }

  function getTotalValue(
    key:
      | 'totalHours'
      | 'plannedHours'
      | 'overtime'
      | 'totalVacation'
      | 'plannedVacation'
      | 'sickDays'
  ) {
    if (!data) return 0;
    return (
      data.monthlyData.reduce((sum, m) => sum + m[key], 0) +
      getManualAdjustment(key)
    );
  }

  return (
    <ManagementLayout>
      <div className="p-6">
        <Group justify="space-between" align="flex-start" mb="md">
          <Stack gap={2}>
            <Title order={3}>Zeitarbeitskonto - Detail</Title>
            {currentUserName && (
              <Text c="dimmed">
                {currentUserName} · Jahr {year}
              </Text>
            )}
          </Stack>

          <Group gap="xs">
            <Select
              leftSection={<IconUser size={16} />}
              placeholder="Mitarbeiter wählen"
              data={userOptions}
              value={selectedUserId}
              onChange={(val) => {
                if (!val) return;
                setSelectedUserId(val);
                // URL updaten, damit Deep-Linking funktioniert
                router.push(`/management/timeAccount/${val}`, undefined, {
                  shallow: true,
                });
              }}
              w={220}
            />
            <Select
              leftSection={<IconCalendar size={16} />}
              data={yearOptions}
              value={String(year)}
              onChange={(val) => {
                if (!val) return;
                setYear(Number(val));
              }}
              w={120}
            />
          </Group>
        </Group>

        <Paper withBorder radius="md" p="md">
          {loading || !data ? (
            <Group justify="center" py="lg">
              <Loader />
            </Group>
          ) : (
            <ScrollArea type="auto">
              <Table
                striped
                highlightOnHover
                withColumnBorders
                withTableBorder
                stickyHeader
                miw={900}
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th> </Table.Th>
                    {monthLabelsShort.map((label) => (
                      <Table.Th key={label} ta="center">
                        {label}
                      </Table.Th>
                    ))}
                    <Table.Th ta="center">Manueller Ausgleich</Table.Th>
                    <Table.Th ta="center">Gesamt</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rowsConfig.map((row) => (
                    <Table.Tr key={row.key}>
                      <Table.Td fw={500}>{row.label}</Table.Td>
                      {monthLabelsShort.map((_, monthIndex) => {
                        const value = getMonthValue(monthIndex, row.key);
                        return (
                          <Table.Td key={monthIndex} ta="right">
                            {fmt(value)}
                          </Table.Td>
                        );
                      })}
                      <Table.Td ta="right">
                        {fmt(getManualAdjustment(row.key))}
                      </Table.Td>
                      <Table.Td ta="right">
                        {fmt(getTotalValue(row.key))}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          )}
        </Paper>
      </div>
    </ManagementLayout>
  );
}
