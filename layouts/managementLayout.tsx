import {
  AppShell,
  Group,
  NavLink,
  ScrollArea,
  ActionIcon,
  Text,
  Badge,
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
} from '@tabler/icons-react';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { hasRole } from '@/lib/auth';
import { Role } from '@/generated/prisma';
import axios from 'axios';
import useSWR from 'swr';
import { KioskStartDialog } from '@/components/kiosk/startModal';

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

  const links = [
    {
      label: 'Dashboard',
      icon: IconLayoutDashboard,
      href: '/management/dashboard',
      role: 'MANAGER',
    },
    {
      label: 'Schichtplan',
      icon: IconCalendar,
      href: '/management/planner',
      role: 'MANAGER',
    },
    {
      label: 'Mitarbeiter',
      icon: IconUsers,
      href: '/management/users',
      role: 'MANAGER',
    },
    {
      label: 'Änderungs-Anfragen',
      icon: IconClipboardCheck,
      href: '/management/requests',
      role: 'MANAGER',
    },
    {
      label: 'Einstellungen',
      icon: IconSettings,
      href: '/management/settings',
      role: 'MANAGER',
    },
    {
      label: 'Lohnabrechnung',
      icon: IconCoins,
      href: '/management/payroll',
      role: 'MANAGER',
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
            {links
              .filter(({ role }) => user && hasRole(user, role as Role))
              .map((l) => {
                const active = router.pathname.startsWith(l.href);
                return (
                  <div key={l.href} className="relative">
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
                        root: `transition-all rounded-md mx-2 my-2 ${
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
          </div>
        </ScrollArea>
      </AppShell.Navbar>

      {/* MAIN CONTENT */}
      <AppShell.Main className="bg-slate-50">{children}</AppShell.Main>
    </AppShell>
  );
}
