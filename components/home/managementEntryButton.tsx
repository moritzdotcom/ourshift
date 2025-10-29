import {
  HoverCard,
  Button,
  Group,
  Stack,
  Text,
  Anchor,
  Divider,
  Box,
} from '@mantine/core';
import {
  IconSettings,
  IconUsersGroup,
  IconClockHour4,
  IconChartBar,
  IconLayoutDashboard,
  IconCalendar,
  IconUsers,
  IconClipboardCheck,
  IconCoins,
} from '@tabler/icons-react';
import Link from 'next/link';

type Role = 'EMPLOYEE' | 'MANAGER' | 'ADMIN';

export default function ManagementEntryButton() {
  return (
    <HoverCard
      width={260}
      shadow="md"
      position="bottom-end"
      withinPortal
      openDelay={50}
      closeDelay={100}
    >
      <HoverCard.Target>
        <Button
          variant="light"
          color="orange"
          leftSection={<IconSettings size={16} stroke={1.5} />}
          styles={{
            root: { fontWeight: 500 },
          }}
        >
          Management
        </Button>
      </HoverCard.Target>

      <HoverCard.Dropdown
        style={{
          borderRadius: 12,
          minWidth: 240,
          padding: '0.75rem 1rem',
        }}
      >
        <Stack gap="xs">
          <Text fw={500} fz="sm">
            Management Console
          </Text>
          <Text fz={12} c="dimmed" lh={1.4}>
            Schneller Zugriff auf Verwaltung & Auswertung
          </Text>
        </Stack>

        <Divider my="sm" />

        <Stack gap="sm">
          <Link href="/management/dashboard" style={{ textDecoration: 'none' }}>
            <Group gap="xs" wrap="nowrap">
              <IconLayoutDashboard size={18} stroke={1.5} />
              <Box>
                <Text fz="sm" fw={500} c="gray.9">
                  Dashboard
                </Text>
                <Text fz={11} c="dimmed" lh={1.4}>
                  Alles auf einem Blick
                </Text>
              </Box>
            </Group>
          </Link>

          <Link href="/management/planner" style={{ textDecoration: 'none' }}>
            <Group gap="xs" wrap="nowrap">
              <IconCalendar size={18} stroke={1.5} />
              <Box>
                <Text fz="sm" fw={500} c="gray.9">
                  Dienstplan
                </Text>
                <Text fz={11} c="dimmed" lh={1.4}>
                  Schichten planen
                </Text>
              </Box>
            </Group>
          </Link>

          <Link href="/management/users" style={{ textDecoration: 'none' }}>
            <Group gap="xs" wrap="nowrap">
              <IconUsers size={18} stroke={1.5} />
              <Box>
                <Text fz="sm" fw={500} c="gray.9">
                  Team
                </Text>
                <Text fz={11} c="dimmed" lh={1.4}>
                  Mitarbeiterdaten, Verträge, Zuschlagsregeln
                </Text>
              </Box>
            </Group>
          </Link>

          <Link href="/management/requests" style={{ textDecoration: 'none' }}>
            <Group gap="xs" wrap="nowrap">
              <IconClipboardCheck size={18} stroke={1.5} />
              <Box>
                <Text fz="sm" fw={500} c="gray.9">
                  Änderungs-Anfragen
                </Text>
                <Text fz={11} c="dimmed" lh={1.4}>
                  Stempelzeiten korrigieren
                </Text>
              </Box>
            </Group>
          </Link>

          <Link href="/management/settings" style={{ textDecoration: 'none' }}>
            <Group gap="xs" wrap="nowrap">
              <IconSettings size={18} stroke={1.5} />
              <Box>
                <Text fz="sm" fw={500} c="gray.9">
                  App-Einstellungen
                </Text>
                <Text fz={11} c="dimmed" lh={1.4}>
                  Schicht-Codes & Feiertage
                </Text>
              </Box>
            </Group>
          </Link>

          <Link href="/management/payroll" style={{ textDecoration: 'none' }}>
            <Group gap="xs" wrap="nowrap">
              <IconCoins size={18} stroke={1.5} />
              <Box>
                <Text fz="sm" fw={500} c="gray.9">
                  Lohnabrechnung
                </Text>
                <Text fz={11} c="dimmed" lh={1.4}>
                  Finanzbuchhaltung auf einem Blick
                </Text>
              </Box>
            </Group>
          </Link>
        </Stack>
      </HoverCard.Dropdown>
    </HoverCard>
  );
}
