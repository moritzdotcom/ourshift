import { KioskShift } from '@/hooks/useKioskData';
import { Box, Stack, Text, Modal, Group, Center } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { useState, useCallback } from 'react';

type KioskPinModalProps = {
  opened: boolean;
  onClose: () => void;
  shift: KioskShift | null;
  handlePunch: (
    shiftId: string,
    pin: string
  ) => Promise<
    | {
        validPin: boolean;
        error: null;
      }
    | {
        validPin: null;
        error: any;
      }
  >;
};

export default function KioskPinModal({
  opened,
  onClose,
  shift,
  handlePunch,
}: KioskPinModalProps) {
  const [pinSuccess, setPinSuccess] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  async function handleSubmit(pin: string) {
    if (!shift) return;
    setPinError(null);

    const { validPin, error } = await handlePunch(shift?.id, pin);

    if (!validPin) {
      setPinError(error || 'Ungültige PIN');
      return;
    }

    setPinSuccess(true);

    setTimeout(() => {
      setPinSuccess(false);
      setPinError(null);
      onClose();
    }, 800);
  }

  return (
    <Modal
      opened={opened}
      onClose={() => {
        if (!pinSuccess) {
          setPinError(null);
          onClose();
        }
      }}
      centered
      withCloseButton={false}
      radius="md"
      overlayProps={{
        backgroundOpacity: 0.6,
        blur: 4,
        color: 'black',
      }}
      styles={{
        content: {
          backgroundColor: '#111',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'white',
        },
        header: { backgroundColor: 'transparent' },
        body: { backgroundColor: 'transparent' },
      }}
    >
      <Stack align="center" gap={7}>
        {pinSuccess ? (
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
        ) : (
          <PinInput
            label={
              shift ? `PIN für ${shift.user.firstName}` : 'Bitte PIN eingeben'
            }
            pinLength={shift?.user?.kiosk?.pinLength || 4}
            error={pinError}
            onSubmit={handleSubmit}
          />
        )}
      </Stack>
    </Modal>
  );
}

export function PinInput({
  label,
  pinLength,
  onSubmit,
  error,
}: {
  label: string;
  pinLength: number;
  onSubmit: (pin: string) => void;
  error?: string | null;
}) {
  const [pinValue, setPinValue] = useState('');

  const MAX_PIN_LEN = 6;

  const keypadLayout = [
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '⌫',
    '0',
    'OK',
  ];

  const handleKeypadPress = useCallback(
    (key: string) => {
      if (key === '⌫') {
        setPinValue((v) => v.slice(0, -1));
        return;
      }
      if (key === 'OK') {
        setPinValue('');
        onSubmit(pinValue);
      }

      if (/^\d$/.test(key)) {
        setPinValue((v) => (v.length >= MAX_PIN_LEN ? v : v + key));
      }
    },
    [pinValue]
  );

  return (
    <>
      <Text
        style={{
          fontSize: '1rem',
          color: 'rgba(255,255,255,0.8)',
          fontWeight: 500,
        }}
      >
        {label}
      </Text>

      {/* PIN Bullets */}
      <Group gap={8} style={{ minHeight: '2rem' }}>
        {Array.from({
          length: pinLength,
        }).map((_, i) => (
          <Box
            key={i}
            style={{
              width: '0.8rem',
              height: '0.8rem',
              borderRadius: '9999px',
              backgroundColor:
                i < pinValue.length ? 'white' : 'rgba(255,255,255,0.2)',
              transition: 'background-color 0.15s',
            }}
          />
        ))}
      </Group>

      {error && (
        <Text
          style={{
            color: '#ef4444',
            fontSize: '0.875rem',
            fontWeight: 500,
            minHeight: '1rem',
          }}
        >
          {error}
        </Text>
      )}

      {/* Keypad */}
      <Box
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 4.5rem)',
          gridAutoRows: '4.5rem',
          gap: '0.75rem',
          justifyContent: 'center',
          paddingBottom: '0.5rem',
          marginTop: '1rem',
        }}
      >
        {keypadLayout.map((key) => (
          <button
            key={key}
            onClick={() => handleKeypadPress(key)}
            className={`text-white flex items-center justify-center hover:brightness-90 active:brightness-75 transition aspect-square w-full rounded-full`}
            style={{
              backgroundColor:
                key === 'OK' ? '#10b981' : key === '⌫' ? '#374151' : '#1f2937',
              border:
                key === 'OK'
                  ? '1px solid rgba(16,185,129,0.8)'
                  : '1px solid rgba(255,255,255,0.08)',
              fontSize: '1.7rem',
              fontWeight: 600,
            }}
          >
            {key}
          </button>
        ))}
      </Box>
    </>
  );
}
