import { Card, Stack, Title, Text, Button, Center } from '@mantine/core';
import Link from 'next/link';
import { IconLogout2 } from '@tabler/icons-react';

export default function LogoutPage() {
  return (
    <Center
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--mantine-color-gray-0)',
        padding: '1rem',
      }}
    >
      <Card
        withBorder
        radius="lg"
        shadow="sm"
        p="xl"
        style={{
          maxWidth: 360,
          width: '100%',
          textAlign: 'center',
          backgroundColor: 'var(--mantine-color-white)',
        }}
      >
        <Stack align="center" gap="md">
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '9999px',
              backgroundColor: 'var(--mantine-color-gray-1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconLogout2
              size={34}
              stroke={1.5}
              style={{ color: 'var(--mantine-color-gray-7)' }}
            />
          </div>

          <Title order={3} style={{ lineHeight: 1.2 }}>
            Du hast dich erfolgreich ausgeloggt.
          </Title>

          <Text c="dimmed" fz="sm">
            Vielen Dank. Bis zum nächsten Mal.
          </Text>

          <Button
            component={Link}
            href="/auth/login"
            variant="filled"
            color="dark"
            radius="md"
            fullWidth
            mt="md"
          >
            Erneut anmelden
          </Button>
        </Stack>
      </Card>
    </Center>
  );
}
