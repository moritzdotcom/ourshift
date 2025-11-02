import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Stack,
  Group,
  Text,
  TextInput,
  ScrollArea,
  Button,
  Avatar,
  Box,
  Divider,
} from '@mantine/core';
import {
  IconSearch,
  IconChevronRight,
  IconUser,
  IconArrowLeft,
  IconCheck,
  IconX,
  IconKey,
} from '@tabler/icons-react';
import { PinInput } from './pinModal';

type KioskUser = {
  id: string;
  firstName: string;
  lastName: string;
  kiosk: { pinLength: number } | null;
};

type KioskShiftLike = { id: string };

export default function KioskUserModal({
  opened,
  onClose,
  shift,
  users,
  handleTakeover, // (shiftId, pin) => Promise<boolean>
}: {
  opened: boolean;
  onClose: () => void;
  shift: KioskShiftLike | null;
  users: KioskUser[];
  handleTakeover: (
    shiftId: string,
    userId: string,
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
}) {
  const [query, setQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q)
    );
  }, [users, query]);

  useEffect(() => {
    if (!opened) {
      setQuery('');
      setSelectedUserId(null);
      setPinError(null);
      setSubmitting(false);
      setSuccess(false);
    }
  }, [opened]);

  const pinLength = Math.min(
    Math.max(selectedUser?.kiosk?.pinLength ?? 4, 4),
    6
  );

  function initials(u: KioskUser) {
    return `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase();
  }

  async function submitPin(pin: string) {
    if (!shift) return;
    if (!selectedUser) {
      setPinError('Bitte zuerst einen Nutzer wählen.');
      return;
    }
    if (!pin || pin.length < 1) {
      setPinError('Bitte PIN eingeben.');
      return;
    }
    try {
      setSubmitting(true);
      setPinError(null);
      const { validPin, error } = await handleTakeover(
        shift.id,
        selectedUser.id,
        pin
      );
      if (!validPin) {
        setPinError(error || 'Falsche PIN');
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 700);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={() => {
        if (submitting) return;
        onClose();
      }}
      centered
      radius="md"
      size="md"
      withCloseButton={!submitting && !success}
      title={
        <Group gap="xs">
          <IconUser size={18} stroke={1.7} />
          <Text fw={600} fz="sm">
            Schicht übernehmen
          </Text>
        </Group>
      }
      overlayProps={{ backgroundOpacity: 0.6, blur: 4, color: 'black' }}
      styles={{
        content: {
          backgroundColor: '#111',
          color: 'white',
          border: '1px solid rgba(255,255,255,0.12)',
        },
        header: { background: 'transparent' },
        body: { background: 'transparent' },
        title: { color: 'white' },
        close: { color: 'white' },
      }}
    >
      <Stack gap="md">
        {/* STEP 1: User wählen */}
        {!selectedUser && !success && (
          <>
            <Text c="dimmed">Wähle dich in der Liste aus</Text>
            <ScrollArea.Autosize mah={360}>
              <Stack gap={6}>
                {filtered.map((u) => (
                  <Button
                    key={u.id}
                    variant="subtle"
                    onClick={() => {
                      setSelectedUserId(u.id);
                      setPinError(null);
                    }}
                    styles={{
                      root: {
                        justifyContent: 'space-between',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      },
                      label: { width: '100%' },
                    }}
                    size="lg"
                  >
                    <Group justify="space-between" w="100%" py="sm">
                      <Group gap="sm">
                        <Avatar radius="xl" color="dark" variant="filled">
                          {initials(u) || <IconUser size={16} />}
                        </Avatar>
                        <Box>
                          <Text fw={600} fz="sm" c="white">
                            {u.firstName} {u.lastName}
                          </Text>
                        </Box>
                      </Group>
                      <IconChevronRight />
                    </Group>
                  </Button>
                ))}
                {filtered.length === 0 && (
                  <Text c="dimmed" fz="sm">
                    Keine Treffer.
                  </Text>
                )}
              </Stack>
            </ScrollArea.Autosize>
          </>
        )}

        {/* STEP 2: PIN (mit deiner PinInput) */}
        {selectedUser && !success && (
          <>
            <Group justify="space-between" align="center">
              <Button
                variant="subtle"
                leftSection={<IconArrowLeft size={16} />}
                onClick={() => {
                  if (submitting) return;
                  setSelectedUserId(null);
                  setPinError(null);
                }}
                styles={{
                  root: {
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'white',
                    height: '2rem',
                  },
                }}
              >
                Nutzer wechseln
              </Button>

              <Group gap="xs">
                <Avatar radius="xl" color="dark" variant="filled">
                  {selectedUser ? (
                    initials(selectedUser)
                  ) : (
                    <IconUser size={16} />
                  )}
                </Avatar>
                <Text fw={600}>
                  {selectedUser.firstName} {selectedUser.lastName}
                </Text>
              </Group>
            </Group>

            <Divider
              my="xs"
              color="rgba(255,255,255,0.12)"
              style={{ borderTopWidth: 1 }}
            />

            <Group gap="xs" align="center">
              <IconKey size={16} />
              <Text fz="sm" c="dimmed">
                Bitte PIN eingeben ({pinLength}-stellig)
              </Text>
            </Group>

            <Stack align="center" gap={7}>
              <PinInput
                label={`PIN für ${selectedUser.firstName}`}
                pinLength={pinLength}
                error={pinError}
                onSubmit={(pin) => {
                  void submitPin(pin);
                }}
              />
            </Stack>
          </>
        )}

        {/* Success */}
        {success && (
          <Stack align="center" gap="sm" mt="sm">
            <Box
              style={{
                width: 64,
                height: 64,
                borderRadius: 999,
                background: '#10b981',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <IconCheck size={34} color="white" stroke={2} />
            </Box>
            <Text>Übernahme erfolgreich</Text>
          </Stack>
        )}
      </Stack>
    </Modal>
  );
}
