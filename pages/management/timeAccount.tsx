import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Button,
  Group,
  Loader,
  Select,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { IconCalendar, IconRefresh } from '@tabler/icons-react';
import ManagementLayout from '@/layouts/managementLayout';
import { WorkingStatsEntry } from '@/lib/timeAccount';
import { KpiCacheType } from '@/lib/kpiCache';
import { dateTimeToHuman } from '@/lib/dates';

export default function TimeAccountSimple() {
  const today = new Date();
  const [year, setYear] = useState<number>(today.getFullYear());
  const [month, setMonth] = useState<number>(today.getMonth());
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [rows, setRows] = useState<WorkingStatsEntry[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchData(recalc?: boolean) {
    setLoading(true);
    const { data } = await axios.get<KpiCacheType<'TIMEACCOUNT'>>(
      '/api/users/timeAccount',
      {
        params: { year, month, recalc },
      }
    );
    setUpdatedAt(new Date(data.calculationDoneAt));
    setRows(data.payload);
    setLoading(false);
    return data;
  }

  useEffect(() => {
    (async () => {
      await fetchData();
    })();
  }, [year, month]);

  const fmt = (n: number) =>
    Intl.NumberFormat('de', { maximumFractionDigits: 1 }).format(n);

  function monthLabel(y: number, m: number) {
    return new Date(y, m, 1).toLocaleDateString('de', {
      month: 'long',
      year: 'numeric',
    });
  }

  return (
    <ManagementLayout>
      <div className="p-6">
        <Group justify="space-between">
          <Stack gap={2}>
            <Title order={3}>Zeitarbeitskonto</Title>
            {updatedAt && (
              <Text c="dimmed">
                Berechnung am: {dateTimeToHuman(updatedAt)}
              </Text>
            )}
          </Stack>
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
        <div className="flex justify-end">
          <Button
            size="xs"
            variant="subtle"
            color="gray"
            onClick={() => fetchData(true)}
          >
            <IconRefresh className={`${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {loading ? (
          <Group justify="center" py="lg">
            <Loader />
          </Group>
        ) : (
          <div>
            <Table
              striped
              highlightOnHover
              withTableBorder
              withColumnBorders
              stickyHeader
              mt="sm"
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th ta="center">Mitarbeiter</Table.Th>
                  <Table.Th ta="center">Ist Stunden Monat</Table.Th>
                  <Table.Th ta="center">Soll Stunden Monat</Table.Th>
                  <Table.Th ta="center">Ist Stunden Jahr</Table.Th>
                  <Table.Th ta="center">Soll Stunden Jahr</Table.Th>
                  <Table.Th ta="center">Überstunden</Table.Th>
                  <Table.Th ta="center">Ist Urlaub Monat</Table.Th>
                  <Table.Th ta="center">Ist Urlaub Jahr</Table.Th>
                  <Table.Th ta="center">Soll Urlaub Jahr</Table.Th>
                  <Table.Th ta="center">Resturlaub VJ</Table.Th>
                  <Table.Th ta="center">Krankentage Monat</Table.Th>
                  <Table.Th ta="center">KrankenTage Jahr</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(rows ?? []).map((r) => (
                  <Table.Tr key={r.user.id}>
                    <Table.Td>
                      {r.user.firstName} {r.user.lastName}
                    </Table.Td>
                    <Table.Td ta="right">{fmt(r.mHours)}</Table.Td>
                    <Table.Td ta="right">{fmt(r.mHoursPlan)}</Table.Td>
                    <Table.Td ta="right">{fmt(r.yHours)}</Table.Td>
                    <Table.Td ta="right">{fmt(r.yHoursPlan)}</Table.Td>
                    <Table.Td ta="right" c={r.overtime >= 0 ? 'green' : 'red'}>
                      {fmt(r.overtime)}
                    </Table.Td>
                    <Table.Td ta="right">{fmt(r.mVacation)}</Table.Td>
                    <Table.Td ta="right">{fmt(r.yVacation)}</Table.Td>
                    <Table.Td ta="right">{fmt(r.yVacationPlan)}</Table.Td>
                    <Table.Td ta="right">{fmt(r.rVacationPrevYear)}</Table.Td>
                    <Table.Td ta="right">{fmt(r.mSickDays)}</Table.Td>
                    <Table.Td ta="right">{fmt(r.ySickDays)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </div>
        )}
      </div>
    </ManagementLayout>
  );
}
