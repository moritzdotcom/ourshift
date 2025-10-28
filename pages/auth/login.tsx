import { useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import {
  Card,
  TextInput,
  PasswordInput,
  Button,
  Checkbox,
  Text,
  Group,
  Stack,
  Center,
} from '@mantine/core';
import axios from 'axios';

export default function LoginPage() {
  const router = useRouter();
  const [emailOrUser, setEmailOrUser] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await axios.post('/api/auth/login', {
        identifier: emailOrUser.trim(),
        password,
        remember,
      });
      router.replace('/'); // Ziel nach Login
    } catch (e: any) {
      setErr(e?.response?.data?.error || 'Login fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Center
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--mantine-color-gray-0)',
        padding: '1rem',
      }}
    >
      <Card withBorder radius="lg" p="xl" className="w-full max-w-md bg-white">
        <div className="flex flex-col items-center gap-2 mb-6">
          <div className="w-2/3 mb-5">
            <Image
              src="/logo.png"
              alt="Logo"
              width={500}
              height={100}
              priority
              className="w-full h-auto"
            />
          </div>
          <Text fw={700} size="lg">
            Anmeldung
          </Text>
          <Text c="dimmed" size="sm">
            Bitte melde dich mit deinen Zugangsdaten an.
          </Text>
        </div>

        {err && (
          <div className="bg-red-200 text-red-900 rounded w-full p-3 my-3">
            {err}
          </div>
        )}

        <form onSubmit={onSubmit}>
          <Stack gap="sm">
            <TextInput
              label="E-Mail"
              placeholder="z. B. max@firma.de"
              value={emailOrUser}
              onChange={(e) => setEmailOrUser(e.currentTarget.value)}
              autoFocus
              required
            />
            <PasswordInput
              label="Passwort"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              required
            />
            <Group justify="space-between" mt="xs">
              <Checkbox
                label="Angemeldet bleiben"
                checked={remember}
                onChange={(e) => setRemember(e.currentTarget.checked)}
              />
              {/* Optional: "Passwort vergessen?" Link */}
            </Group>
            <Button type="submit" loading={loading} fullWidth mt="sm">
              Anmelden
            </Button>
          </Stack>
        </form>
      </Card>
    </Center>
  );
}
