import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import {
  Button,
  Group,
  Loader,
  NumberInput,
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
import { showSuccess } from '@/lib/toast';

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

  const [manualAdjustment, setManualAdjustment] = useState<number>(
    data?.manualAdjustment || 0
  );

  // User-Liste holen (z. B. für Dropdown)
  useEffect(() => {
    async function fetchUsers() {
      const { data } = await axios.get<ApiGetSimpleUsersResponse>(
        '/api/users?simple=true'
      );
      setUsers(data.filter((u) => u.isActive));
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
      variant: 'bold' as const,
    },
    {
      key: 'workedHours' as const,
      label: 'Davon gearbeitet',
      type: 'hours',
      variant: 'light' as const,
    },
    {
      key: 'vacationHours' as const,
      label: 'Davon Urlaub',
      type: 'hours',
      variant: 'light' as const,
    },
    {
      key: 'sickHours' as const,
      label: 'Davon krank',
      type: 'hours',
      variant: 'light' as const,
    },
    {
      key: 'plannedHours' as const,
      label: 'Soll Stunden',
      type: 'hours',
      variant: 'bold' as const,
    },
    {
      key: 'overtime' as const,
      label: 'Überstunden',
      type: 'hours',
      variant: 'bold' as const,
    },
    {
      key: 'totalVacation' as const,
      label: 'Urlaub Ist',
      type: 'days',
      variant: 'bold' as const,
    },
    {
      key: 'plannedVacation' as const,
      label: 'Urlaub Soll',
      type: 'days',
      variant: 'bold' as const,
    },
    {
      key: 'sickDays' as const,
      label: 'Krankentage',
      type: 'days',
      variant: 'bold' as const,
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

  const averageHourlySalary = useMemo(() => {
    if (!data) return 0;
    const totalSalaryCents = data.monthlyData.reduce(
      (sum, m) => sum + m.averageSalaryCents,
      0
    );
    return totalSalaryCents / data.monthlyData.length / 100;
  }, [data]);

  // Helper um Monatsdaten zu finden
  function getMonthValue(
    monthIndex: number,
    key:
      | 'totalHours'
      | 'workedHours'
      | 'vacationHours'
      | 'sickHours'
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

  async function saveManualAdjustment() {
    if (!selectedUserId) return;
    await axios.post(`/api/users/${selectedUserId}/manualAdjustment`, {
      year,
      hoursAdjustment: manualAdjustment,
    });
    showSuccess('Manueller Ausgleich gespeichert');
  }

  function getTotalValue(
    key:
      | 'totalHours'
      | 'workedHours'
      | 'vacationHours'
      | 'sickHours'
      | 'plannedHours'
      | 'overtime'
      | 'totalVacation'
      | 'plannedVacation'
      | 'sickDays',
    includeManualAdjustment = false
  ) {
    if (!data) return 0;
    if (
      includeManualAdjustment &&
      (key === 'totalHours' || key === 'overtime')
    ) {
      return (
        data.monthlyData.reduce((sum, m) => sum + m[key], 0) + manualAdjustment
      );
    }
    return data.monthlyData.reduce((sum, m) => sum + m[key], 0);
  }

  useEffect(() => {
    setManualAdjustment(data?.manualAdjustment || 0);
  }, [data]);

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
                tabularNums
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
                      <Table.Td fw={500}>
                        <p
                          className={
                            row.variant === 'light'
                              ? 'text-gray-500 text-sm ml-3'
                              : ''
                          }
                        >
                          {row.label}
                        </p>
                      </Table.Td>
                      {monthLabelsShort.map((_, monthIndex) => {
                        const value = getMonthValue(monthIndex, row.key);
                        return (
                          <Table.Td
                            key={monthIndex}
                            ta="right"
                            className={
                              row.variant === 'light'
                                ? 'text-gray-500 text-sm'
                                : ''
                            }
                          >
                            {fmt(value)}
                          </Table.Td>
                        );
                      })}
                      <Table.Td ta="right">
                        {row.key === 'overtime' || row.key === 'totalHours'
                          ? fmt(manualAdjustment)
                          : '-'}
                      </Table.Td>
                      <Table.Td ta="right" fw={700}>
                        {fmt(getTotalValue(row.key, true))}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          )}
        </Paper>

        {data && (
          <Paper withBorder radius="md" p="md" mt={16}>
            <Text size="lg">Manuellen Ausgleich eingeben</Text>
            <Text c="dimmed" size="sm" mt={4} mb={8}>
              Empfohlener Ausgleich:{' '}
              {getTotalValue('overtime') >= 0
                ? `${getTotalValue('overtime')} Überstunden ≙ ${fmtEuro(
                    data?.monthlyData.reduce(
                      (sum, m) => sum + m.overtime * m.averageSalaryCents,
                      0
                    ) / 100
                  )} Gutschrift`
                : `${-getTotalValue('overtime')} Minusstunden ≙ ${fmtEuro(
                    data?.monthlyData.reduce(
                      (sum, m) => sum + m.overtime * m.averageSalaryCents,
                      0
                    ) / 100
                  )} Nachzahlung`}
            </Text>
            {/* Formular für manuellen Ausgleich hier */}
            <NumberInput
              label="Manueller Ausgleich in Std."
              value={manualAdjustment}
              onChange={(v) => setManualAdjustment(v as number)}
              step={0.5}
              decimalSeparator=","
              thousandSeparator="."
              suffix=" Std."
            />
            <Text c="dimmed" size="sm" mt={6} mb={8}>
              {manualAdjustment >= 0
                ? `Gutschrift von ${fmtEuro(
                    manualAdjustment * averageHourlySalary
                  )}`
                : `Nachzahlung von ${fmtEuro(
                    manualAdjustment * averageHourlySalary
                  )}`}
            </Text>
            <Group justify="flex-end">
              <Button mt={12} onClick={() => saveManualAdjustment()}>
                Speichern
              </Button>
            </Group>
          </Paper>
        )}
      </div>
    </ManagementLayout>
  );
}

function fmtEuro(num: number) {
  if (num == null) return '-';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(num);
}
