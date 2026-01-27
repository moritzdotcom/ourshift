import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import {
  ActionIcon,
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
import {
  IconUser,
  IconCalendar,
  IconPrinter,
  IconChevronLeft,
} from '@tabler/icons-react';
import ManagementLayout from '@/layouts/managementLayout';
import { ApiGetSimpleUsersResponse } from '@/pages/api/users';
import { ApiUserTimeAccountResponse } from '@/pages/api/users/[userId]/timeAccount';
import { showSuccess } from '@/lib/toast';
import Link from 'next/link';

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
  const { userId, year } = router.query;

  const [data, setData] = useState<ApiUserTimeAccountResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Detaildaten laden
  useEffect(() => {
    if (!userId || !year) return;
    async function fetchDetail() {
      setLoading(true);
      try {
        const { data } = await axios.get<ApiUserTimeAccountResponse>(
          `/api/users/${userId}/timeAccount`,
          {
            params: { year },
          },
        );
        setData(data);
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [userId, year]);

  useEffect(() => {
    if (data) {
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [data]);

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
      label: 'Arbeit',
      type: 'hours',
      variant: 'light' as const,
    },
    {
      key: 'vacationHours' as const,
      label: 'Urlaub',
      type: 'hours',
      variant: 'light' as const,
    },
    {
      key: 'sickHours' as const,
      label: 'Krank',
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
      label: 'Urlaub Plan',
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
      | 'sickDays',
  ) {
    const m = data?.monthlyData.find((m) => m.month === monthIndex);
    if (!m) return 0;
    return m[key];
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
  ) {
    if (!data) return 0;
    return data.monthlyData.reduce((sum, m) => sum + m[key], 0);
  }

  return (
    <div className="p-6">
      <div className="print:hidden my-3">
        <Link href={`/management/timeAccount/${userId}`}>
          <Button variant="light" leftSection={<IconChevronLeft />}>
            Zurück
          </Button>
        </Link>
      </div>
      <Group justify="space-between" align="flex-start" mb="md">
        <Stack gap={2}>
          <Title order={3}>Zeitarbeitskonto - Detail</Title>
          {currentUserName && (
            <Text c="dimmed">
              {currentUserName} · Jahr {year}
            </Text>
          )}
        </Stack>
      </Group>

      {loading || !data ? (
        <Group justify="center" py="lg">
          <Loader />
        </Group>
      ) : (
        <Table striped withColumnBorders withTableBorder tabularNums>
          <Table.Thead>
            <Table.Tr>
              <Table.Th> </Table.Th>
              {monthLabelsShort.map((label) => (
                <Table.Th key={label} ta="center">
                  {label}
                </Table.Th>
              ))}
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
                        row.variant === 'light' ? 'text-gray-500 text-sm' : ''
                      }
                    >
                      {fmt(value)}
                    </Table.Td>
                  );
                })}
                <Table.Td ta="right" fw={700}>
                  {fmt(getTotalValue(row.key))}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
      <style jsx global>{`
        @page {
          size: A4 landscape;
          margin: 12mm;
        }
        @media print {
          html,
          body {
            background: white !important;
          }
          .state {
            display: none;
          }
        }
        .print-root {
          font-family:
            system-ui,
            -apple-system,
            Segoe UI,
            Roboto,
            Arial;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          color: #111;
        }
      `}</style>
    </div>
  );
}
