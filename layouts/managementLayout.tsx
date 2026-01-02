import {
  AppShell,
  Group,
  NavLink,
  ScrollArea,
  ActionIcon,
  Text,
  Badge,
  Button,
  Divider,
} from '@mantine/core';
import {
  IconCalendar,
  IconSettings,
  IconUsers,
  IconLayoutDashboard,
  IconClipboardCheck,
  IconMenu2,
  IconChevronLeft,
  IconCoins,
  IconDoorExit,
  IconCalendarCheck,
  IconClock2,
  IconFileTime,
} from '@tabler/icons-react';
import { Fragment, useState } from 'react';
import { useRouter } from 'next/router';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { hasRole } from '@/lib/auth';
import { Role } from '@/generated/prisma';
import axios from 'axios';
import useSWR from 'swr';
import { KioskStartDialog } from '@/components/kiosk/startModal';
import HtmlHead from '@/components/htmlHead';

export default function ManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(true);
  const router = useRouter();
  const { user } = useCurrentUser();

  const { data: requestCount } = useSWR('/api/changeRequests/count', () =>
    axios.get<number>('/api/changeRequests/count').then((r) => r.data)
  );

  const groups = [
    {
      title: 'Reports',
      links: [
        {
          label: 'Dashboard',
          icon: IconLayoutDashboard,
          href: '/management/dashboard',
          role: 'MANAGER',
        },
        {
          label: 'Lohnabrechnung',
          icon: IconCoins,
          href: '/management/payroll',
          role: 'MANAGER',
        },
        {
          label: 'Zeitarbeitskonto',
          icon: IconClock2,
          href: '/management/timeAccount',
          role: 'MANAGER',
        },
        {
          label: 'Stundenzettel',
          icon: IconFileTime,
          href: '/management/timeSheets',
          role: 'MANAGER',
        },
      ],
    },
    {
      title: 'Planung',
      links: [
        {
          label: 'Schichtplan',
          icon: IconCalendar,
          href: '/management/planner',
          role: 'MANAGER',
        },
        {
          label: 'Monatsabschluss',
          icon: IconCalendarCheck,
          href: '/management/monthClosing',
          role: 'MANAGER',
        },
        {
          label: 'Änderungs-Anfragen',
          icon: IconClipboardCheck,
          href: '/management/requests',
          role: 'MANAGER',
        },
      ],
    },
    {
      title: 'Organisation',
      links: [
        {
          label: 'Mitarbeiter',
          icon: IconUsers,
          href: '/management/users',
          role: 'MANAGER',
        },

        {
          label: 'Einstellungen',
          icon: IconSettings,
          href: '/management/settings',
          role: 'MANAGER',
        },
      ],
    },
  ];

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{
        width: collapsed ? 65 : 230,
        breakpoint: 'sm',
        collapsed: { mobile: collapsed },
      }}
      padding={0}
    >
      <HtmlHead title="OurShift - Management Console" />
      {/* HEADER */}
      <AppShell.Header className="flex items-center justify-between px-4 border-b bg-white/90 backdrop-blur">
        <Group gap="xs">
          <ActionIcon
            variant="subtle"
            size="lg"
            onClick={() => setCollapsed((c) => !c)}
            aria-label="Sidebar umschalten"
          >
            {collapsed ? <IconMenu2 /> : <IconChevronLeft />}
          </ActionIcon>
          <Text className="hidden sm:block" fw={600}>
            Management Console
          </Text>
        </Group>

        <Group>
          <KioskStartDialog />
        </Group>
      </AppShell.Header>

      {/* SIDEBAR */}
      <AppShell.Navbar p={0}>
        <ScrollArea className="h-full">
          <div className="py-4">
            {groups.map((g) => {
              return (
                <Fragment key={g.title}>
                  <div className="ml-3">
                    {!collapsed && (
                      <Text size="xs" c="dimmed" ml="md" mb={5}>
                        {g.title}
                      </Text>
                    )}
                    <Divider />
                  </div>
                  {g.links
                    .filter(({ role }) => user && hasRole(user, role as Role))
                    .map((l) => {
                      const active = router.pathname.startsWith(l.href);
                      return (
                        <div key={l.href} className="relative ml-3">
                          <NavLink
                            key={l.href}
                            component="button"
                            onClick={() => {
                              setCollapsed(true);
                              router.push(l.href);
                            }}
                            active={active}
                            leftSection={<l.icon size={25} />}
                            label={collapsed ? null : l.label}
                            classNames={{
                              root: `transition-all rounded-l-md my-2 ${
                                active
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'hover:bg-gray-50'
                              }`,
                              label: 'text-sm font-medium',
                            }}
                          ></NavLink>
                          <Badge
                            size="sm"
                            circle
                            pos="absolute"
                            top={collapsed ? 2 : 12}
                            right={collapsed ? 3 : 7}
                            color="red"
                            variant="filled"
                            hidden={
                              l.href !== '/management/requests' ||
                              !requestCount ||
                              requestCount === 0
                            }
                          >
                            {requestCount}
                          </Badge>
                        </div>
                      );
                    })}
                </Fragment>
              );
            })}
          </div>
        </ScrollArea>
        {collapsed ? (
          <ActionIcon
            component="button"
            onClick={() => {
              setCollapsed(true);
              router.push('/');
            }}
            variant="light"
            color="red"
            size="input-md"
            classNames={{
              root: `transition-all rounded-md mx-2 my-2`,
            }}
          >
            <IconDoorExit size={25} />
          </ActionIcon>
        ) : (
          <Button
            component="button"
            onClick={() => {
              setCollapsed(true);
              router.push('/');
            }}
            variant="light"
            color="red"
            leftSection={<IconDoorExit size={25} />}
            classNames={{
              root: `transition-all rounded-md mx-2 my-2`,
              label: 'text-sm font-medium',
            }}
          >
            Console Verlassen
          </Button>
        )}
      </AppShell.Navbar>

      {/* MAIN CONTENT */}
      <AppShell.Main className="bg-slate-50">{children}</AppShell.Main>
    </AppShell>
  );
}
