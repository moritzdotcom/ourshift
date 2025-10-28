import React, { useState } from 'react';
import Link from 'next/link';
import {
  Paper,
  Stack,
  TextInput,
  PasswordInput,
  Button,
  Group,
  Title,
  Text,
  Divider,
  Box,
} from '@mantine/core';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { IconHome } from '@tabler/icons-react';

export default function ProfilePage() {
  const { user, update, logout, updateCredentials } = useCurrentUser();

  // ----------- Persönliche Daten -----------
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileStatus, setProfileStatus] = useState<null | 'ok' | 'err'>(null);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileStatus(null);
    try {
      await update({
        firstName,
        lastName,
        email,
        phone,
      });
      setProfileStatus('ok');
    } catch (err) {
      console.error(err);
      setProfileStatus('err');
    } finally {
      setSavingProfile(false);
    }
  }

  // ----------- Passwort ändern -----------
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [repeatPw, setRepeatPw] = useState('');

  const [savingPw, setSavingPw] = useState(false);
  const [pwStatus, setPwStatus] = useState<null | 'ok' | 'err' | 'mismatch'>(
    null
  );

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwStatus(null);

    if (newPw !== repeatPw) {
      setPwStatus('mismatch');
      return;
    }

    setSavingPw(true);
    try {
      await updateCredentials({
        currentPassword: currentPw,
        newPassword: newPw,
      });

      setPwStatus('ok');
      setCurrentPw('');
      setNewPw('');
      setRepeatPw('');
    } catch (err) {
      console.error(err);
      setPwStatus('err');
    } finally {
      setSavingPw(false);
    }
  }

  // ----------- Kiosk PIN ändern -----------
  const [pin, setPin] = useState('');
  const [savingPin, setSavingPin] = useState(false);
  const [pinStatus, setPinStatus] = useState<null | 'ok' | 'err' | 'invalid'>(
    null
  );

  function isValidPin(v: string) {
    // Nur Ziffern, Länge 4-6
    return /^[0-9]{4,6}$/.test(v);
  }

  async function handleSavePin(e: React.FormEvent) {
    e.preventDefault();
    setPinStatus(null);

    if (!isValidPin(pin)) {
      setPinStatus('invalid');
      return;
    }

    setSavingPin(true);
    try {
      await updateCredentials({
        newPin: pin,
      });
      setPinStatus('ok');
    } catch (err) {
      console.error(err);
      setPinStatus('err');
    } finally {
      setSavingPin(false);
    }
  }

  // ----------- Logout -----------
  async function handleLogout() {
    await logout();
  }

  return (
    <Box
      maw={600}
      mx="auto"
      px="md"
      py="xl"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
      }}
    >
      {/* Header-Bereich */}
      <Group justify="space-between">
        <div>
          <Title order={2}>Mein Profil</Title>
          <Text c="dimmed" fz="sm">
            Persönliche Daten verwalten, Zugangsdaten ändern
          </Text>
        </div>

        <Button
          component={Link}
          href="/"
          variant="light"
          radius="md"
          leftSection={<IconHome size={15} />}
        >
          Zur Startseite
        </Button>
      </Group>

      {/* Persönliche Daten */}
      <Paper withBorder radius="lg" p="lg" shadow="xs">
        <Stack gap="xs">
          <div>
            <Title order={4}>Persönliche Daten</Title>
            <Text c="dimmed" fz="sm">
              Diese Informationen werden für Dienstpläne und Kommunikation
              verwendet.
            </Text>
          </div>

          <form onSubmit={handleSaveProfile}>
            <Stack gap="md" mt="sm">
              <Group wrap="wrap" grow gap="md">
                <TextInput
                  label="Vorname"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.currentTarget.value)}
                />
                <TextInput
                  label="Nachname"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.currentTarget.value)}
                />
              </Group>

              <Group wrap="wrap" grow gap="md">
                <TextInput
                  label="E-Mail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                  // falls optional, kein required hier
                />
                <TextInput
                  label="Telefon / Handy"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.currentTarget.value)}
                />
              </Group>

              {/* Statusanzeige */}
              {profileStatus === 'ok' && (
                <Text c="teal" fz="sm">
                  Gespeichert ✓
                </Text>
              )}
              {profileStatus === 'err' && (
                <Text c="red" fz="sm">
                  Konnte nicht gespeichert werden.
                </Text>
              )}

              <Group justify="flex-end" mt="sm">
                <Button
                  type="submit"
                  loading={savingProfile}
                  radius="md"
                  variant="filled"
                  color="dark"
                >
                  Speichern
                </Button>
              </Group>
            </Stack>
          </form>
        </Stack>
      </Paper>

      {/* Passwort ändern */}
      <Paper withBorder radius="lg" p="lg" shadow="xs">
        <Stack gap="xs">
          <div>
            <Title order={4}>Passwort ändern</Title>
            <Text c="dimmed" fz="sm">
              Wähle ein sicheres Passwort, das du nicht woanders benutzt.
            </Text>
          </div>

          <form onSubmit={handleChangePassword}>
            <Stack gap="md" mt="sm">
              <PasswordInput
                label="Aktuelles Passwort"
                required
                value={currentPw}
                onChange={(e) => setCurrentPw(e.currentTarget.value)}
              />

              <Group wrap="wrap" grow gap="md">
                <PasswordInput
                  label="Neues Passwort"
                  required
                  value={newPw}
                  onChange={(e) => setNewPw(e.currentTarget.value)}
                />
                <PasswordInput
                  label="Passwort wiederholen"
                  required
                  value={repeatPw}
                  onChange={(e) => setRepeatPw(e.currentTarget.value)}
                />
              </Group>

              {/* Status/Fehler */}
              {pwStatus === 'mismatch' && (
                <Text c="red" fz="sm">
                  Die neuen Passwörter stimmen nicht überein.
                </Text>
              )}
              {pwStatus === 'ok' && (
                <Text c="teal" fz="sm">
                  Passwort aktualisiert ✓
                </Text>
              )}
              {pwStatus === 'err' && (
                <Text c="red" fz="sm">
                  Passwort konnte nicht geändert werden.
                </Text>
              )}

              <Group justify="flex-end" mt="sm">
                <Button
                  type="submit"
                  loading={savingPw}
                  radius="md"
                  variant="filled"
                  color="dark"
                >
                  Passwort ändern
                </Button>
              </Group>
            </Stack>
          </form>
        </Stack>
      </Paper>

      {/* Kiosk PIN */}
      <Paper withBorder radius="lg" p="lg" shadow="xs">
        <Stack gap="xs">
          <div>
            <Title order={4}>Kiosk PIN</Title>
            <Text c="dimmed" fz="sm">
              4-6 stellige Zahl. Diese PIN wird am Kiosk zum Ein- und
              Ausstempeln genutzt.
            </Text>
          </div>

          <form onSubmit={handleSavePin}>
            <Stack gap="md" mt="sm" w="100%">
              <TextInput
                label="PIN"
                value={pin}
                onChange={(e) => {
                  // Nur Ziffern erlauben
                  const onlyDigits = e.currentTarget.value.replace(/\D+/g, '');
                  // Nicht länger als 6
                  if (onlyDigits.length <= 6) {
                    setPin(onlyDigits);
                  }
                }}
                inputMode="numeric"
                maxLength={6}
                styles={{
                  input: {
                    textAlign: 'center',
                    fontSize: '1.25rem',
                    letterSpacing: '0.2em',
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 500,
                  },
                }}
                description="Nur Zahlen, 4-6 Stellen"
              />

              {/* Status/Fehler */}
              {pinStatus === 'invalid' && (
                <Text c="red" fz="sm">
                  PIN muss 4-6 Ziffern haben.
                </Text>
              )}
              {pinStatus === 'ok' && (
                <Text c="teal" fz="sm">
                  PIN gespeichert ✓
                </Text>
              )}
              {pinStatus === 'err' && (
                <Text c="red" fz="sm">
                  PIN konnte nicht gespeichert werden.
                </Text>
              )}

              <Group justify="flex-end" mt="sm">
                <Button
                  type="submit"
                  loading={savingPin}
                  radius="md"
                  variant="filled"
                  color="dark"
                >
                  PIN speichern
                </Button>
              </Group>
            </Stack>
          </form>
        </Stack>
      </Paper>

      {/* Logout-Bereich */}
      <Box>
        <Divider my="lg" />
        <Stack gap="xs" align="center">
          <Button
            variant="light"
            color="red"
            radius="md"
            fullWidth
            onClick={handleLogout}
            styles={{
              root: {
                border: '1px solid var(--mantine-color-red-filled)',
                backgroundColor: 'var(--mantine-color-red-light)',
              },
            }}
          >
            Abmelden
          </Button>

          <Text c="dimmed" fz={11} ta="center">
            Du wirst auf allen Geräten abgemeldet.
          </Text>
        </Stack>
      </Box>
    </Box>
  );
}
