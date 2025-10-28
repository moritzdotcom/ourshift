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
  // PIN Modal State
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState(false);

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
    async (key: string) => {
      if (key === '⌫') {
        setPinValue((v) => v.slice(0, -1));
        setPinError(null);
        return;
      }
      if (key === 'OK') {
        if (!shift) return;

        setPinValue('');

        const { validPin, error } = await handlePunch(shift?.id, pinValue);

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

        return;
      }

      if (/^\d$/.test(key)) {
        setPinError(null);
        setPinValue((v) => (v.length >= MAX_PIN_LEN ? v : v + key));
      }
    },
    [pinValue]
  );

  return (
    <Modal
      opened={opened}
      onClose={() => {
        if (!pinSuccess) {
          setPinValue('');
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
          <>
            <Text
              style={{
                fontSize: '1rem',
                color: 'rgba(255,255,255,0.8)',
                fontWeight: 500,
              }}
            >
              {shift ? `PIN für ${shift.user.firstName}` : 'Bitte PIN eingeben'}
            </Text>

            {/* PIN Bullets */}
            <Group gap={8} style={{ minHeight: '2rem' }}>
              {Array.from({
                length: Math.max(
                  pinValue.length,
                  shift?.user.kiosk?.pinLength ?? 4
                ),
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

            {pinError && (
              <Text
                style={{
                  color: '#ef4444',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  minHeight: '1rem',
                }}
              >
                {pinError}
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
                      key === 'OK'
                        ? '#10b981'
                        : key === '⌫'
                        ? '#374151'
                        : '#1f2937',
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
        )}
      </Stack>
    </Modal>
  );
}
