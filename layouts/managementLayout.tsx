import {
  AppShell,
  Group,
  NavLink,
  ScrollArea,
  ActionIcon,
  Tooltip,
  Text,
} from '@mantine/core';
import {
  IconCalendar,
  IconSettings,
  IconUsers,
  IconFileSpreadsheet,
  IconLayoutDashboard,
  IconClipboardCheck,
  IconMenu2,
  IconChevronLeft,
  IconCoins,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function ManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(true);
  const router = useRouter();

  const links = [
    {
      label: 'Dashboard',
      icon: IconLayoutDashboard,
      href: '/management/dashboard',
    },
    { label: 'Schichtplan', icon: IconCalendar, href: '/management/plan' },
    { label: 'Mitarbeiter', icon: IconUsers, href: '/management/users' },
    {
      label: 'Change Requests',
      icon: IconClipboardCheck,
      href: '/management/requests',
    },
    {
      label: 'Einstellungen',
      icon: IconSettings,
      href: '/management/settings',
    },
    {
      label: 'Lohnabrechnung',
      icon: IconCoins,
      href: '/management/payroll',
    },
  ];

  return (
    <AppShell
      layout="alt"
      header={{ height: 56 }}
      navbar={{
        width: collapsed ? 65 : 230,
        breakpoint: 'sm',
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
          <Text fw={600}>Management Console</Text>
        </Group>

        <Group>
          {/* Platz für Benutzer-Menü, Zeitraum, Logout etc. */}
          <Tooltip label="Demnächst: Schnellzugriffe" withArrow>
            <ActionIcon variant="light" color="gray">
              <IconFileSpreadsheet size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </AppShell.Header>

      {/* SIDEBAR */}
      <AppShell.Navbar p={0}>
        <ScrollArea className="h-full">
          <div className="py-4">
            {links.map((l) => {
              const active = router.pathname.startsWith(l.href);
              return (
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
                      active ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-50'
                    }`,
                    label: 'text-sm font-medium',
                  }}
                ></NavLink>
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
