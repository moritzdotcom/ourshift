import { useState } from 'react';
import {
  Modal,
  Button,
  Text,
  Stack,
  Group,
  TextInput,
  Box,
} from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import axios from 'axios';

function isValidPin(pin: string) {
  return /^[0-9]{4,6}$/.test(pin);
}

export function KioskStartDialog() {
  const [opened, setOpened] = useState(false);

  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  async function handleStartKiosk() {
    setApiError(null);
    setPinError(null);

    if (!isValidPin(pin)) {
      setPinError('PIN muss 4-6 Ziffern haben');
      return;
    }

    try {
      setSubmitting(true);

      // Call dein /api/kiosk/start Endpoint
      // Erwartung:
      //  - setzt Cookies (os_session_backup, kiosk_mode, kiosk_unlock_hash, os_session=role:KIOSK)
      //  - gibt { ok: true } zurück
      const res = await axios.post('/api/kiosk/start', { pin });

      if (res.data?.ok) {
        // Redirect in den Kiosk
        window.location.href = '/kiosk';
        return;
      }

      // Falls ok nicht true ist, zeigen wir eine generische Meldung
      setApiError('Kiosk konnte nicht gestartet werden.');
    } catch (err: any) {
      console.error(err);
      if (err.response?.data?.error) {
        setApiError(err.response.data.error);
      } else {
        setApiError('Serverfehler beim Starten des Kiosks.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpen() {
    // Reset state jedes Mal beim Öffnen
    setPin('');
    setPinError(null);
    setApiError(null);
    setOpened(true);
  }

  function handleClose() {
    if (submitting) return;
    setOpened(false);
  }

  return (
    <>
      {/* Das ist der Button in der Navbar */}
      <Button
        variant="light"
        color="dark"
        radius="md"
        leftSection={<IconLock size={16} stroke={1.5} />}
        onClick={handleOpen}
        styles={{
          root: {
            fontWeight: 500,
          },
        }}
      >
        Kiosk starten
      </Button>

      {/* Das eigentliche Modal */}
      <Modal
        opened={opened}
        onClose={handleClose}
        centered
        radius="md"
        withCloseButton={!submitting}
        title={
          <Group gap={8}>
            <IconLock size={18} stroke={1.5} />
            <Text fw={500} fz="sm">
              Kiosk-Modus aktivieren
            </Text>
          </Group>
        }
      >
        <Stack gap="md">
          <Text fz="sm" c="dimmed" lh={1.4}>
            Dieses Gerät wird in den Kiosk-Modus versetzt. Danach kann nur noch
            die Kiosk-Ansicht genutzt werden. Zum Verlassen wird die hier
            gesetzte PIN benötigt.
          </Text>

          {/* PIN Input */}
          <Box>
            <TextInput
              label="Kiosk-PIN"
              description="4-6 Ziffern. Diese PIN brauchst du später zum Entsperren."
              placeholder="z. B. 1234"
              value={pin}
              onChange={(e) => {
                const onlyDigits = e.currentTarget.value.replace(/\D+/g, '');
                if (onlyDigits.length <= 6) {
                  setPin(onlyDigits);
                }
                setPinError(null);
                setApiError(null);
              }}
              error={pinError || undefined}
              disabled={submitting}
              inputMode="numeric"
              styles={{
                input: {
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '0.08em',
                  fontWeight: 500,
                },
              }}
            />
          </Box>

          {/* API Fehler falls etwas vom Server zurückkommt */}
          {apiError && (
            <Text c="red" fz="sm" fw={500}>
              {apiError}
            </Text>
          )}

          <Group justify="flex-end" mt="md">
            <Button
              variant="default"
              radius="md"
              onClick={handleClose}
              disabled={submitting}
            >
              Abbrechen
            </Button>

            <Button
              radius="md"
              color="dark"
              loading={submitting}
              onClick={handleStartKiosk}
              styles={{
                root: {
                  fontWeight: 600,
                },
              }}
            >
              Kiosk starten
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
