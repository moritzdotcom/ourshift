// pages/currentShift.tsx
import {
  Badge,
  Button,
  Center,
  Group,
  Loader,
  RingProgress,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  IconCalendarTime,
  IconClockHour4,
  IconPlayerPlayFilled,
  IconPlayerStopFilled,
  IconSquareRoundedX,
} from '@tabler/icons-react';
import useSWR from 'swr';
import axios from 'axios';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ApiGetCurrentShiftResponse } from './api/shifts/currentShift';
import { shiftCodeColor } from '@/lib/shiftCode';
import Link from 'next/link';

const fetcher = (url: string) =>
  axios.get<ApiGetCurrentShiftResponse>(url).then((r) => r.data);

function fmt(dtISO: string) {
  return new Date(dtISO).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
function durSecs(aISO: string, bISO: string) {
  return Math.max(
    0,
    Math.round((new Date(bISO).getTime() - new Date(aISO).getTime()) / 1000)
  );
}
function nowISO() {
  return new Date().toISOString();
}

export default function CurrentShiftPage() {
  const { data, isLoading, mutate } = useSWR(
    '/api/shifts/currentShift',
    fetcher,
    { refreshInterval: 20_000 }
  );

  // 1s Timer für Zeit-Anzeige
  const [secs, setSecs] = useState(0);
  const tickRef = useRef<number | null>(null);
  useEffect(() => {
    tickRef.current = window.setInterval(() => setSecs((v) => v + 1), 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, []);

  const current = data?.current ?? null;
  const next = data?.next ?? null;

  // Button-Status/Label/Icon berechnen
  const { action, disabled, reason } = useMemo(() => {
    if (!current)
      return {
        action: 'none' as const,
        disabled: true,
        reason: 'Keine aktuelle Schicht',
      };

    const now = new Date();
    const start = new Date(current.start);
    const clockIn = current.clockIn ? new Date(current.clockIn) : null;
    const clockOut = current.clockOut ? new Date(current.clockOut) : null;

    // Check-in erlaubt ab 2h vor Start
    const canCheckInFrom = new Date(start.getTime() - 120 * 60_000);
    // Double-click Schutz: 30s Sperre nach Check-in
    const isCooldown = clockIn && now.getTime() - clockIn.getTime() < 60_000;

    if (!clockIn && now < canCheckInFrom) {
      return {
        action: 'checkin' as const,
        disabled: true,
        reason: 'Zu früh (max. 2h vor Beginn)',
      };
    }
    if (!clockIn) {
      return { action: 'checkin' as const, disabled: false, reason: '' };
    }
    if (clockIn && !clockOut) {
      return {
        action: 'checkout' as const,
        disabled: Boolean(isCooldown),
        reason: isCooldown ? 'Kurz warten…' : '',
      };
    }
    // Bereits komplett gestempelt
    return {
      action: 'none' as const,
      disabled: true,
      reason: 'Schicht beendet',
    };
  }, [current, secs]); // secs sorgt für Sekundentakt-Update

  // Ring/Timer-Daten
  const timer = useMemo(() => {
    if (!current) return { label: '00:00:00', value: 0 };
    const total = durSecs(
      current.clockIn ?? current.start,
      current.clockOut ?? current.end
    );
    const now = nowISO();

    const elapsed =
      current.clockIn && current.clockOut
        ? durSecs(current.clockIn, current.clockOut)
        : current.clockIn
        ? durSecs(current.clockIn, now)
        : 0;

    const val =
      total > 0 ? Math.min(100, Math.round((elapsed / total) * 100)) : 0;
    const hh = Math.floor(elapsed / 3600);
    const mm = Math.floor(elapsed / 60) % 60;
    const ss = elapsed % 60;
    return {
      label: `${String(hh).padStart(2, '0')}:${String(mm).padStart(
        2,
        '0'
      )}:${String(ss).padStart(2, '0')}`,
      value: val,
    };
  }, [current, secs]);

  async function handlePunch() {
    if (!current) return;
    if (action === 'checkin') {
      await axios.post(`/api/shifts/${current.id}/checkin`, {
        clockInSource: 'MOBILE',
      });
      await mutate(); // Daten frisch laden
    } else if (action === 'checkout') {
      await axios.post(`/api/shifts/${current.id}/checkout`, {
        clockInSource: 'MOBILE',
      });
      await mutate();
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md">
        <Stack gap="lg" align="center">
          <Title order={2} c="dimmed">
            Aktuelle Schicht
          </Title>

          {isLoading && (
            <Center mih={200}>
              <Loader />
            </Center>
          )}

          {!isLoading && !current && (
            <Stack gap="xs" align="center">
              <IconSquareRoundedX
                size={56}
                color="var(--mantine-color-dimmed)"
              />
              <Text c="dimmed">Keine laufende Schicht</Text>
              <Link href="/">
                <Button variant="subtle">Zur Startseite</Button>
              </Link>
              {next && (
                <Stack gap={4} align="center">
                  <div
                    className={`inline-block px-4 py-1 rounded-xl text-xl font-semibold ${shiftCodeColor(
                      next.code || ''
                    )}`}
                  >
                    {next.code?.label}
                  </div>
                  <Group gap="sm">
                    <Group gap={6}>
                      <IconCalendarTime size={18} />
                      <Text>
                        {new Date(next.start).toLocaleString('de-DE', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </Text>
                    </Group>
                  </Group>
                </Stack>
              )}
            </Stack>
          )}

          {!!current && (
            <>
              {/* Code-Badge */}
              <div
                className={`inline-block px-4 py-1 rounded-xl text-xl font-semibold ${shiftCodeColor(
                  current.code || ''
                )}`}
              >
                {current.code?.label}
              </div>
              {/* Start/Ende */}
              <Group gap="xl">
                <Group gap={6}>
                  <IconClockHour4 size={18} />
                  <Text fw={600}>{fmt(current.clockIn ?? current.start)}</Text>
                </Group>
                <Group gap={6}>
                  <IconCalendarTime size={18} />
                  <Text fw={600}>{fmt(current.clockOut ?? current.end)}</Text>
                </Group>
              </Group>

              {/* Timer */}
              <RingProgress
                size={250}
                thickness={16}
                sections={[{ value: timer.value, color: 'teal' }]}
                label={
                  <p className="font-mono font-semibold text-3xl text-center">
                    {timer.label}
                  </p>
                }
              />

              {/* Punch-Button */}
              <div className="mt-2">
                {action === 'checkin' && (
                  <Button
                    radius="xl"
                    size="xl"
                    style={{ width: 250, height: 60 }}
                    leftSection={<IconPlayerPlayFilled />}
                    color="teal"
                    disabled={disabled}
                    onClick={handlePunch}
                  >
                    Einstempeln
                  </Button>
                )}
                {action === 'checkout' && (
                  <Button
                    radius="xl"
                    size="xl"
                    style={{ width: 250, height: 60 }}
                    leftSection={<IconPlayerStopFilled />}
                    color="red"
                    disabled={disabled}
                    onClick={handlePunch}
                  >
                    Ausstempeln
                  </Button>
                )}
                {action === 'none' && (
                  <Text c="dimmed" ta="center">
                    — {reason} —
                  </Text>
                )}
                {!disabled && reason && (
                  <Text c="dimmed" ta="center" size="sm" mt="xs">
                    {reason}
                  </Text>
                )}
              </div>
            </>
          )}
        </Stack>
      </div>
    </div>
  );
}
