import { Shift } from '@/generated/prisma';
import { timeToHuman } from '@/lib/dates';
import { showError, showInfo } from '@/lib/toast';
import { MyShift } from '@/pages';
import {
  Card,
  Group,
  ActionIcon,
  Divider,
  Badge,
  Button,
  Text,
} from '@mantine/core';
import {
  IconExternalLink,
  IconClockPlay,
  IconPlayerStop,
  IconPlayerPlay,
} from '@tabler/icons-react';
import axios, { isAxiosError } from 'axios';
import Link from 'next/link';
import { useRef } from 'react';
import SlideActionButton from '../slideActionButton';

function fmtDate(s: string | Date) {
  const d = typeof s === 'string' ? new Date(s) : s;
  return d.toLocaleDateString('de', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

export default function HomeCurrentShift({
  shift,
  upcomingShift,
  loading,
  onUpdate,
}: {
  shift?: MyShift | null;
  upcomingShift?: MyShift | null;
  loading: boolean;
  onUpdate: (newShift: Shift) => void;
}) {
  const pendingRef = useRef<Map<string, 'checkin' | 'checkout'>>(new Map());

  const isPending = (id: string) => pendingRef.current.has(id);

  async function checkIn(shiftId: string) {
    if (pendingRef.current.has(shiftId)) return;
    pendingRef.current.set(shiftId, 'checkin');
    try {
      const { data } = await axios.post<Shift>(
        `/api/shifts/${shiftId}/checkin`,
        {
          clockInSource: 'MOBILE',
        }
      );
      onUpdate(data);
      showInfo(`Checkin: ${timeToHuman(new Date())}`);
    } catch (error) {
      if (isAxiosError(error) && error.response?.data.error) {
        showError(error.response?.data.error);
      } else {
        showError('Fehler beim Einchecken');
      }
    }
    pendingRef.current.delete(shiftId);
  }
  async function checkOut(shiftId: string) {
    if (pendingRef.current.has(shiftId)) return;
    pendingRef.current.set(shiftId, 'checkout');
    try {
      const { data } = await axios.post<Shift>(
        `/api/shifts/${shiftId}/checkout`,
        {
          clockOutSource: 'MOBILE',
        }
      );
      onUpdate(data);
      showInfo(`Checkout: ${timeToHuman(new Date())}`);
    } catch (error) {
      if (isAxiosError(error) && error.response?.data.error) {
        showError(error.response?.data.error);
      } else {
        showError('Fehler beim Auschecken');
      }
    }
    pendingRef.current.delete(shiftId);
  }

  return (
    <Card withBorder radius="lg" p="lg" className="bg-white">
      <Group justify="space-between" align="flex-start">
        <div>
          <div className="flex gap-2 items-center">
            <Text fw={600}>Aktuelle Schicht</Text>
            {shift?.code && (
              <div
                className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold shift-code-${shift?.code.color}`}
              >
                {shift?.code.label}
              </div>
            )}
          </div>
          {loading ? (
            <Text c="dimmed" size="sm">
              Lade…
            </Text>
          ) : shift ? (
            <div>
              <Text c="dimmed" size="sm">
                {fmtDate(shift.start)}
              </Text>
              <Text c="dimmed" size="sm">
                {timeToHuman(shift.start)} - {timeToHuman(shift.end)}
              </Text>
            </div>
          ) : (
            <Text c="dimmed" size="sm">
              Derzeit keine aktive Schicht.
            </Text>
          )}
        </div>
        <Link href="/plan" className="sm:hidden">
          <ActionIcon variant="subtle" aria-label="Plan öffnen">
            <IconExternalLink size={18} />
          </ActionIcon>
        </Link>
      </Group>

      <Divider my="md" />

      {shift ? (
        <div className="w-full flex flex-col sm:flex-row gap-3 items-start justify-between">
          <Badge
            color="green"
            variant="light"
            size="lg"
            leftSection={<IconClockPlay size={14} />}
          >
            Läuft seit {timeToHuman(shift.clockIn || shift.start)}
          </Badge>
          <div className="w-full sm:max-w-xs">
            {shift.clockIn && !shift.clockOut && shift.code?.isWorkingShift ? (
              <SlideActionButton
                disabled={isPending(shift.id)}
                onComplete={() => checkOut(shift.id)}
                color="red"
                id="CheckOut"
              >
                Ausstempeln
              </SlideActionButton>
            ) : (
              <SlideActionButton
                disabled={isPending(shift.id)}
                onComplete={() => checkIn(shift.id)}
                color="green"
                id="CheckIn"
              >
                Einstempeln
              </SlideActionButton>
            )}
          </div>
        </div>
      ) : (
        <Group justify="space-between">
          <Text c="dimmed">
            Sobald eine Schicht startet, erscheint hier dein Check-in.
          </Text>
          {!loading && upcomingShift && (
            <Badge variant="light">
              Nächste: {fmtDate(upcomingShift.start)}{' '}
              {timeToHuman(upcomingShift.start)}-
              {timeToHuman(upcomingShift.end)}
            </Badge>
          )}
        </Group>
      )}
    </Card>
  );
}
