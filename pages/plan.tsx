import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import axios from 'axios';
import { Group, Title, Button, Text, Divider, Stack } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconChevronLeft,
  IconChevronRight,
  IconCalendar,
  IconHome,
  IconCircleCheck,
} from '@tabler/icons-react';
import type { ApiMyShiftResponse } from '@/pages/api/shifts/my';
import type { Holiday } from '@/generated/prisma';
import PlanMonthGrid from '@/components/plan/monthGrid';
import PlanMobileAgenda from '@/components/plan/mobileAgenda';
import {
  daysInMonth,
  endOfMonthExclusive,
  startOfMonth,
  weekdayIndexMon0,
} from '@/lib/plan';
import { MyShift } from '.';
import Link from 'next/link';
import HtmlHead from '@/components/htmlHead';
import { minutesBetween } from '@/lib/dates';

const fetcher = (url: string) => axios.get(url).then((r) => r.data);

export default function PlanPage() {
  const today = new Date();
  const [year, setYear] = useState<number>(today.getFullYear());
  const [month, setMonth] = useState<number>(today.getMonth()); // 0-based

  // Responsive breakpoints (Tailwind md ~ 768px)
  const isMobile = useMediaQuery('(max-width: 1200px)');

  const from = useMemo(() => startOfMonth(year, month), [year, month]);
  const to = useMemo(() => endOfMonthExclusive(year, month), [year, month]);

  const { data: shiftData, isLoading } = useSWR<ApiMyShiftResponse>(
    `/api/shifts/my?from=${from.toISOString()}&to=${to.toISOString()}`,
    fetcher,
    { revalidateOnFocus: false }
  );
  const shifts = useMemo(
    () => (shiftData ? shiftData.shifts : []),
    [shiftData]
  );
  const vacationDays = useMemo(
    () => (shiftData ? shiftData.vacationDays : []),
    [shiftData]
  );

  const { data: holidays } = useSWR<Holiday[]>(`/api/holidays`, fetcher, {
    revalidateOnFocus: false,
  });

  // Indexe pro Tag (Berlin-Tageskey)
  const shiftsByDay = useMemo(() => {
    const map = new Map<string, MyShift[]>();
    if (!shifts) return map;
    for (const s of shifts) {
      const d = new Date(s.start);
      const key = d.toLocaleDateString();
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    for (const [k, arr] of map.entries()) {
      arr.sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
      );
      map.set(k, arr);
    }
    return map;
  }, [shifts]);

  const minutesWorked = useMemo(() => {
    return shifts.reduce((a, shift) => {
      if (shift.clockIn && shift.clockOut)
        return a + minutesBetween(shift.clockIn, shift.clockOut);
      return a + 0;
    }, 0);
  }, [shifts]);

  const monthLabel = useMemo(
    () =>
      new Date(year, month, 1).toLocaleDateString('de-DE', {
        month: 'long',
        year: 'numeric',
      }),
    [year, month]
  );

  const monthDays = daysInMonth(year, month);
  const firstDay = new Date(year, month, 1);
  const leadingBlanks = weekdayIndexMon0(firstDay);
  const cells: Array<{ date: Date; inMonth: boolean } | { blank: true }> = [];

  for (let i = 0; i < leadingBlanks; i++) cells.push({ blank: true } as any);
  for (let d = 1; d <= monthDays; d++)
    cells.push({ date: new Date(year, month, d, 2), inMonth: true } as any);
  while (cells.length % 7 !== 0) cells.push({ blank: true } as any);

  function nav(delta: number) {
    const base = new Date(year, month + delta, 1);
    setYear(base.getFullYear());
    setMonth(base.getMonth());
  }

  return (
    <div className="p-6 space-y-6">
      <HtmlHead title="Dein Schichtplan" />
      <Link href="/">
        <Button
          leftSection={<IconHome size={15} />}
          variant="light"
          size="sm"
          mb={12}
        >
          Zur Startseite
        </Button>
      </Link>
      <Group justify="space-between" align="center">
        <Stack gap={0}>
          <Title order={2}>Mein Schichtplan</Title>
          <Title fw={300} size="md" c="dimmed">
            Gearbeitet: {Math.round(minutesWorked / 60)} Std.
          </Title>
        </Stack>
        <Group>
          <Button
            variant="light"
            visibleFrom="sm"
            leftSection={<IconChevronLeft size={16} />}
            onClick={() => nav(-1)}
          >
            Zurück
          </Button>
          <Button variant="light" hiddenFrom="sm" onClick={() => nav(-1)}>
            <IconChevronLeft size={16} />
          </Button>
          <Button
            variant="default"
            leftSection={<IconCalendar size={16} />}
            onClick={() => {
              setYear(today.getFullYear());
              setMonth(today.getMonth());
            }}
          >
            Heute
          </Button>
          <Button
            variant="light"
            visibleFrom="sm"
            rightSection={<IconChevronRight size={16} />}
            onClick={() => nav(1)}
          >
            Weiter
          </Button>
          <Button variant="light" hiddenFrom="sm" onClick={() => nav(1)}>
            <IconChevronRight size={16} />
          </Button>
        </Group>
      </Group>

      <Text c="dimmed">{monthLabel}</Text>

      {isMobile ? (
        <PlanMobileAgenda
          monthDays={monthDays}
          year={year}
          month={month}
          holidays={holidays}
          shifts={shiftsByDay}
          vacationDays={vacationDays}
          loading={isLoading}
        />
      ) : (
        <PlanMonthGrid
          cells={cells}
          holidays={holidays}
          shifts={shiftsByDay}
          vacationDays={vacationDays}
          loading={isLoading}
        />
      )}

      <Divider my="md" />
      <Text size="sm" c="dimmed">
        Zeiten werden in Europe/Berlin angezeigt. Ganztägige Codes (z. B.
        Urlaub) erscheinen ohne Uhrzeiten. Erledigte Schichten sind mit
        <IconCircleCheck color="green" size={14} className="inline mx-1" />
        markiert.
      </Text>
    </div>
  );
}
