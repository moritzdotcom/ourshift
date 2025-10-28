import { useState } from 'react';
import {
  Modal,
  Stack,
  Text,
  Group,
  Button,
  TextInput,
  Center,
} from '@mantine/core';
import { IconLockOpen, IconCheck } from '@tabler/icons-react';
import axios from 'axios';

function isValidPin(pin: string) {
  // gleiches Pattern wie beim Start: 4-6 Ziffern
  return /^[0-9]{4,6}$/.test(pin);
}

type KioskStopModalProps = {
  opened: boolean;
  onClose: () => void; // wird nur erlaubt, wenn wir nicht gerade submitten
};

export function KioskStopModal({ opened, onClose }: KioskStopModalProps) {
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [pinError, setPinError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleExitKiosk() {
    setPinError(null);
    setApiError(null);

    if (!isValidPin(pin)) {
      setPinError('PIN muss 4-6 Ziffern haben');
      return;
    }

    try {
      setSubmitting(true);

      const res = await axios.post('/api/kiosk/stop', {
        pinAttempt: pin,
      });

      if (res.data?.ok) {
        // zeig kurz success animation
        setSuccess(true);

        const redirectTo = res.data.redirectTo || '/management/dashboard';

        // ganz kurz warten für visuelles Feedback
        setTimeout(() => {
          window.location.href = redirectTo;
        }, 500);

        return;
      }

      // Wenn ok === false z. B. falsche PIN
      setApiError(res.data?.error || 'Entsperren fehlgeschlagen.');
    } catch (err: any) {
      console.error(err);
      if (err.response?.data?.error) {
        setApiError(err.response.data.error);
      } else {
        setApiError('Serverfehler beim Entsperren.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    if (submitting) return;
    if (success) return; // während success-anim nicht schließen
    setPin('');
    setPinError(null);
    setApiError(null);
    onClose();
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      centered
      radius="md"
      withCloseButton={!submitting && !success}
      title={
        <Group gap={8}>
          <IconLockOpen size={18} stroke={1.5} />
          <Text fw={500} fz="sm">
            Kiosk-Modus verlassen
          </Text>
        </Group>
      }
      overlayProps={{
        backgroundOpacity: 0.6,
        blur: 4,
        color: 'black',
      }}
      styles={{
        content: {
          backgroundColor: '#111',
          border: '1px solid rgba(255,255,255,0.15)',
          color: 'white',
        },
        header: {
          backgroundColor: 'transparent',
          color: 'white',
        },
        body: {
          backgroundColor: 'transparent',
          color: 'white',
        },
        title: {
          color: 'white',
        },
        close: {
          color: 'white',
        },
      }}
    >
      <Stack gap="md" align="center">
        {success ? (
          <>
            <Center
              style={{
                width: 64,
                height: 64,
                borderRadius: '9999px',
                backgroundColor: '#10b981',
              }}
            >
              <IconCheck size={32} color="white" stroke={2} />
            </Center>
            <Text
              style={{
                fontSize: '1rem',
                color: 'rgba(255,255,255,0.8)',
                fontWeight: 500,
                textAlign: 'center',
              }}
            >
              Kiosk wird beendet…
            </Text>
          </>
        ) : (
          <>
            <Text
              style={{
                fontSize: '0.9rem',
                color: 'rgba(255,255,255,0.75)',
                textAlign: 'center',
                lineHeight: 1.4,
              }}
            >
              Zum Verlassen des Kiosk-Modus bitte die Kiosk-PIN eingeben.
            </Text>

            <TextInput
              label="Kiosk-PIN"
              placeholder="••••"
              value={pin}
              onChange={(e) => {
                const onlyDigits = e.currentTarget.value.replace(/\D+/g, '');
                if (onlyDigits.length <= 6) {
                  setPin(onlyDigits);
                }
                setPinError(null);
                setApiError(null);
              }}
              disabled={submitting}
              error={pinError || undefined}
              inputMode="numeric"
              styles={{
                label: { color: 'rgba(255,255,255,0.6)' },
                input: {
                  backgroundColor: '#1f2937',
                  borderColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 500,
                  letterSpacing: '0.08em',
                },
                error: { color: '#ef4444' },
              }}
            />

            {apiError && (
              <Text
                style={{
                  color: '#ef4444',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  minHeight: '1rem',
                  textAlign: 'center',
                }}
              >
                {apiError}
              </Text>
            )}

            <Group justify="flex-end" w="100%" mt="md">
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
                color="red"
                loading={submitting}
                onClick={handleExitKiosk}
                styles={{
                  root: {
                    fontWeight: 600,
                  },
                }}
              >
                Kiosk verlassen
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  );
}
