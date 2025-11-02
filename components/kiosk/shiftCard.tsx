import { KioskShift } from '@/hooks/useKioskData';
import { Stack, Text, Card, Group, Divider, rem } from '@mantine/core';
import { IconClock } from '@tabler/icons-react';
import { useEffect, useState, useMemo } from 'react';
import PunchTakeoverSwitcher from './punchTakeoverSwitcher';

type ShiftCardProps = {
  shift: KioskShift;
  onPunch: (shift: KioskShift) => void;
  onTakeover: (shift: KioskShift) => void;
};

export default function KioskShiftCard({
  shift,
  onPunch,
  onTakeover,
}: ShiftCardProps) {
  // ---------- Laufzeit-Timer ----------
  // Wir zeigen die Laufzeit nur, wenn clockIn vorhanden ist und clockOut nicht
  const isRunning = !!shift.clockIn && !shift.clockOut;

  // Re-render jede Sekunde, damit Timer live hochzählt
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!isRunning) return;
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, [isRunning]);

  const shiftTimerStr = useMemo(() => {
    if (!isRunning || !shift.clockIn) return null;
    const startMs = new Date(shift.clockIn).getTime();
    const durMs = Date.now() - startMs;
    const totalSec = Math.max(0, Math.floor(durMs / 1000));
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }, [isRunning, shift.clockIn, tick]);

  // ---------- Label für Button ----------
  const punchLabel = isRunning ? 'Ausstempeln' : 'Einstempeln';

  // ---------- Zeiten schön formatiert ----------
  const startStr = new Date(shift.start).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const endStr = new Date(shift.end).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '32rem',
        alignSelf: 'center',
      }}
    >
      {/* Schicht-Info Card */}
      <Card
        withBorder={false}
        radius="md"
        shadow="sm"
        p="lg"
        style={{
          backgroundColor: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'white',
          width: '100%',
        }}
      >
        <Stack gap={4}>
          <Group justify="space-between" wrap="nowrap">
            <Stack gap={2}>
              <Text
                style={{
                  fontSize: rem(14),
                  fontWeight: 500,
                  color: 'gray',
                }}
              >
                {new Date(shift.start).toLocaleDateString('de-DE', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                })}
              </Text>
              <Group gap={6}>
                <IconClock size={20} color="white" stroke={1.5} />
                <Text
                  style={{
                    fontSize: rem(14),
                    fontWeight: 500,
                    color: 'white',
                  }}
                >
                  {startStr} - {endStr}
                </Text>
              </Group>
            </Stack>

            {shiftTimerStr && (
              <Text
                style={{
                  fontSize: rem(12),
                  fontWeight: 500,
                  color: 'var(--mantine-color-teal-4, #38b2ac)',
                }}
              >
                {shiftTimerStr} laufend
              </Text>
            )}
          </Group>

          <Divider
            color="rgba(255,255,255,0.1)"
            my="xs"
            style={{ borderTopWidth: 1 }}
          />

          <Text
            style={{
              fontSize: rem(18),
              fontWeight: 600,
              color: 'white',
              lineHeight: 1.3,
            }}
          >
            {shift.user.firstName} {shift.user.lastName}
          </Text>

          <Text
            style={{
              fontSize: rem(14),
              fontWeight: 400,
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.4,
            }}
          >
            {shift.code?.label ?? ''}
          </Text>
        </Stack>
        {/* Einstempeln / Austempeln Button */}
        <PunchTakeoverSwitcher
          shift={shift}
          isRunning={isRunning}
          punchLabel={punchLabel}
          onPunch={onPunch}
          onTakeover={onTakeover}
        />
      </Card>
    </div>
  );
}
