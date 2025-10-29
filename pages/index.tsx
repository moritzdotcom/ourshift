import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';
import {
  AppShell,
  Card,
  Group,
  Text,
  Button,
  Stack,
  Tooltip,
  Loader,
  Alert,
} from '@mantine/core';
import {
  IconCalendarEvent,
  IconAlertTriangle,
  IconInfoCircle,
  IconUserSquare,
} from '@tabler/icons-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import TimeChangeRequestModal from '@/components/changeRequest/modal';
import { ApiMyShiftResponse } from './api/shifts/my';
import { ApiPostChangeRequestResponse } from './api/changeRequests';
import HomeShiftRow from '@/components/home/shiftRow';
import ShiftRowPast from '@/components/home/shiftRowPast';
import HomeCurrentShift from '@/components/home/currentShift';
import ManagementEntryButton from '@/components/home/managementEntryButton';
import { hasRole } from '@/lib/auth';
import HtmlHead from '@/components/htmlHead';

export type MyShift = ApiMyShiftResponse['shifts'][number];

// ---- Utils
function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfMonth(d = new Date()) {
  const x = startOfDay(new Date(d));
  x.setDate(0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export default function HomePage() {
  const { user, loading: userLoading, error: userError } = useCurrentUser();

  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState<MyShift[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [pastShiftsSlice, setPastShiftsSlice] = useState(4);

  // Zeitraum: letzte 14 Tage bis nächste 14 Tage
  const from = useMemo(() => startOfMonth().toISOString(), []);
  const to = useMemo(() => addDays(startOfDay(), 15).toISOString(), []);
  const now = new Date();

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      setLoading(false);
      setShifts([]);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const { data } = await axios.get<ApiMyShiftResponse>('/api/shifts/my', {
          params: { from, to },
        });
        setShifts(
          data.shifts
            .slice()
            .sort((a, b) => +new Date(a.start) - +new Date(b.start))
        );
      } catch (e: any) {
        setErr(e?.response?.data?.error || 'Fehler beim Laden der Schichten');
      } finally {
        setLoading(false);
      }
    })();
  }, [userLoading, user, from, to]);

  // Kategorisieren
  const { current, upcoming, pastToday, pastEarlier } = useMemo(() => {
    const nowDate = new Date();

    const getStart = (s: MyShift) => new Date(s.start);
    const getEnd = (s: MyShift) => new Date(s.end);

    // Helper: day check (YYYY-MM-DD Vergleich)
    const isSameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    // Kulanzfenster in ms (1 Stunde)
    const GRACE_MS = 60 * 60 * 1000;

    // echte Arbeitszeitfenster
    const startWithinGrace = (s: MyShift) =>
      getStart(s).getTime() - GRACE_MS <= nowDate.getTime();

    const endWithinGrace = (s: MyShift) =>
      nowDate.getTime() <= getEnd(s).getTime() + GRACE_MS;

    // Schicht gilt als "past", wenn entweder
    // - bereits ausgestempelt ODER
    // - offizielles Ende < jetzt (keine Kulanz hier, weil
    //   eine Schicht nach Ende eigentlich vorbei ist, egal ob du spät ausstempelst)
    const isPast = (s: MyShift) => Boolean(s.clockOut) || getEnd(s) < nowDate;

    // "current":
    // - nicht ausgestempelt
    // - wir sind max 1h VOR Start (früh kommen ist ok)
    //   UND noch nicht später als 1h NACH Ende
    //   => also: startWithinGrace && endWithinGrace
    const current =
      shifts.find(
        (s) => !s.clockOut && startWithinGrace(s) && endWithinGrace(s)
      ) ?? null;

    // "upcoming":
    // alles, was NICHT past ist
    // UND noch nicht im Kulanzfenster (= Start liegt noch mehr als 1h in der Zukunft)
    const upcoming = shifts
      .filter(
        (s) =>
          !isPast(s) && getStart(s).getTime() - GRACE_MS > nowDate.getTime()
      )
      .sort((a, b) => +getStart(a) - +getStart(b))
      .slice(0, 8);

    // "past": gesammelt + sortiert (neueste zuerst)
    const past = shifts
      .filter(isPast)
      .sort((a, b) => +getStart(b) - +getStart(a));

    // "pastToday": nur die, die heute gestartet sind
    const pastToday = past
      .filter((s) => isSameDay(getStart(s), nowDate))
      .slice(0, 4);

    // "pastEarlier": alle anderen vergangenen
    const pastEarlier = past.filter((s) => !isSameDay(getStart(s), nowDate));

    return { current, upcoming, pastToday, pastEarlier };
  }, [shifts]);

  // Actions
  const [changeReqShift, setChangeReqShift] = useState<MyShift | null>(null);

  function handleChangeReqCreated(data: ApiPostChangeRequestResponse) {
    const { shiftId } = data;
    setShifts((prev) =>
      prev.map((s) => (s.id == shiftId ? { ...s, changeRequest: data } : s))
    );
  }

  function loadMore() {
    setPastShiftsSlice((prev) => Math.min(prev + 4, pastEarlier.length));
  }
  const canLoadMore = pastShiftsSlice < pastEarlier.length;

  // Loading & Auth-Zustände
  if (userLoading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader />
      </div>
    );
  }
  if (userError === 'unauthorized' || !user) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <Card withBorder radius="lg" p="lg">
          <Alert color="blue" icon={<IconInfoCircle size={16} />}>
            Bitte melde dich an, um deine Schichten zu sehen.
          </Alert>
          <Group justify="center" mt="md">
            <Link href="/login">
              <Button>Zum Login</Button>
            </Link>
          </Group>
        </Card>
      </div>
    );
  }

  return (
    <AppShell padding={0}>
      <AppShell.Main className="min-h-screen bg-gray-50">
        <HtmlHead />
        {/* Header */}
        <div className="px-4 sm:px-6 pt-6 pb-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/icon.png"
                alt="Logo"
                width={36}
                height={36}
                unoptimized
              />
              <div>
                <Text size="lg" fw={700}>
                  Hallo {user.firstName}! 👋
                </Text>
                <Text size="sm" c="dimmed">
                  Heute ist{' '}
                  {now.toLocaleDateString('de', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                  })}
                </Text>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasRole(user, 'MANAGER') && <ManagementEntryButton />}
              <Link href="/plan">
                <Button
                  variant="light"
                  leftSection={<IconCalendarEvent size={16} />}
                >
                  Dein Schichtplan
                </Button>
              </Link>
              <Link href="/profile">
                <Button
                  variant="light"
                  color="grape"
                  leftSection={<IconUserSquare size={16} />}
                >
                  Dein Profil
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 pb-10 space-y-10">
          {/* Aktuelle Schicht */}
          <HomeCurrentShift
            shift={current}
            upcomingShift={upcoming[0]}
            loading={loading}
            onUpdate={(data) =>
              setShifts((prev) =>
                prev.map((s) => (s.id === data.id ? { ...s, ...data } : s))
              )
            }
          />

          {/* Fehlerhinweis */}
          {err && (
            <Alert color="red" icon={<IconInfoCircle size={16} />}>
              {err}
            </Alert>
          )}

          {/* Heute & Kommend */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card withBorder radius="lg" p="lg" className="bg-white">
              <Group justify="space-between" mb="xs">
                <Text fw={600}>Heute & Kommende Schichten</Text>
              </Group>
              <Stack gap="xs">
                {loading ? (
                  <Text c="dimmed" size="sm">
                    Lade…
                  </Text>
                ) : [...(pastToday || []), ...upcoming].length === 0 ? (
                  <Text c="dimmed" size="sm">
                    Keine weiteren Schichten geplant.
                  </Text>
                ) : (
                  [...(pastToday || []), ...upcoming].map((s) => (
                    <HomeShiftRow key={s.id} s={s} />
                  ))
                )}
              </Stack>
            </Card>

            {/* Vergangene Schichten inkl. ChangeRequest */}
            <Card withBorder radius="lg" p="lg" className="bg-white">
              <Group justify="space-between" mb="xs">
                <Text fw={600}>Vergangene Schichten</Text>
                <Tooltip label="Bei Fehlern kannst du eine Änderung anfragen.">
                  <IconAlertTriangle size={16} />
                </Tooltip>
              </Group>
              <Stack gap="xs">
                {loading ? (
                  <Text c="dimmed" size="sm">
                    Lade…
                  </Text>
                ) : pastEarlier.length === 0 ? (
                  <Text c="dimmed" size="sm">
                    Keine Schichten im Verlauf.
                  </Text>
                ) : (
                  <>
                    {pastEarlier.slice(0, pastShiftsSlice).map((s) => (
                      <ShiftRowPast
                        key={s.id}
                        s={s}
                        onChangeRequest={() => setChangeReqShift(s)}
                      />
                    ))}
                    {canLoadMore && (
                      <Button variant="subtle" onClick={loadMore}>
                        Mehr laden...
                      </Button>
                    )}
                  </>
                )}
              </Stack>
            </Card>
          </section>
        </div>

        {/* ChangeRequest Modal (Stub) */}
        {changeReqShift && (
          <TimeChangeRequestModal
            opened={Boolean(changeReqShift)}
            onClose={() => setChangeReqShift(null)}
            shift={changeReqShift}
            onCreated={handleChangeReqCreated}
          />
        )}
      </AppShell.Main>
    </AppShell>
  );
}
