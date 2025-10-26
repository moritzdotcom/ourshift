import React, { useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import axios from 'axios';
import {
  Card,
  Group,
  Stack,
  Text,
  Title,
  Skeleton,
  SegmentedControl,
} from '@mantine/core';
import ManagementLayout from '@/layouts/managementLayout';
import { showError, showSuccess } from '@/lib/toast';
import { ApiGetChangeRequestResponse } from '../api/changeRequests';
import { ChangeStatus } from '@/generated/prisma';
import ChangeRequestCard from '@/components/changeRequest/card';

const fetcher = (url: string) => axios.get(url).then((r) => r.data);

export default function ManagementRequestsPage() {
  const { data, isLoading, error } = useSWR<ApiGetChangeRequestResponse[]>(
    '/api/changeRequests',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30_000,
    }
  );

  const [filter, setFilter] = React.useState<ChangeStatus | 'ALL'>('PENDING');

  const list = useMemo(() => {
    const arr = data ?? [];
    const filtered =
      filter === 'ALL' ? arr : arr.filter((r) => r.status === filter);
    // Sortiere Pending zuerst nach erstellt (neueste oben), sonst updatedAt
    return filtered.sort((a, b) => {
      const aT = new Date(a.createdAt).getTime();
      const bT = new Date(b.createdAt).getTime();
      return bT - aT;
    });
  }, [data, filter]);

  async function updateStatus(
    id: string,
    status: Exclude<ChangeStatus, 'PENDING'>
  ) {
    const key = '/api/changeRequests';
    // Optimistic update
    const prev = data ?? [];
    const next = prev.map((r) => (r.id === id ? { ...r, status } : r));
    mutate(key, next, false);
    try {
      await axios.put(`/api/changeRequests/${id}`, { status });
      showSuccess(
        status === 'APPROVED' ? 'Antrag angenommen' : 'Antrag abgelehnt'
      );
      await mutate(key); // revalidate
    } catch (e: any) {
      showError(e?.response?.data?.message ?? 'Update fehlgeschlagen');
      mutate(key, prev, false); // rollback
    }
  }

  const onAccept = (id: string) => updateStatus(id, 'APPROVED');
  const onReject = (id: string) => updateStatus(id, 'REJECTED');

  return (
    <ManagementLayout>
      <Stack p="lg" gap="lg">
        <Group justify="space-between" align="center">
          <Title order={2}>Änderungs-Anfragen</Title>
          <SegmentedControl
            value={filter}
            onChange={(v: any) => setFilter(v)}
            data={[
              { label: 'Offen', value: 'PENDING' },
              { label: 'Genehmigt', value: 'APPROVED' },
              { label: 'Abgelehnt', value: 'REJECTED' },
              { label: 'Alle', value: 'ALL' },
            ]}
          />
        </Group>

        {isLoading && (
          <Stack>
            <Skeleton h={140} radius="lg" />
            <Skeleton h={140} radius="lg" />
            <Skeleton h={140} radius="lg" />
          </Stack>
        )}
        {error && <Text c="red">Konnte Änderungs-Anfragen nicht laden.</Text>}

        <Stack gap="md">
          {list.map((cr) => (
            <ChangeRequestCard
              key={cr.id}
              cr={cr}
              onAccept={onAccept}
              onReject={onReject}
            />
          ))}
          {!isLoading && list.length === 0 && (
            <Card withBorder radius="lg">
              <Text c="dimmed">Keine Einträge.</Text>
            </Card>
          )}
        </Stack>
      </Stack>
    </ManagementLayout>
  );
}
