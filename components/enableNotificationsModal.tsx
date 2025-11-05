import { Modal, Text, Button, Stack, Group } from '@mantine/core';
import { IconBell, IconCheck } from '@tabler/icons-react';
import { usePushRegistration } from '@/hooks/usePushRegistration';
import { usePushPrefs } from '@/hooks/usePushPrefs';
import { useState } from 'react';
import { markPushPromptDone, snoozePushPrompt } from '@/lib/pushPromptGate';

export function EnableNotificationsModal({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {
  const { supported, permission, register } = usePushRegistration();
  const { hasToken, refresh } = usePushPrefs();
  const [busy, setBusy] = useState(false);

  // Vollständig eingerichtet = supported + Permission granted + Token vorhanden
  const fullySetup = supported && permission === 'granted' && !!hasToken;

  // Button soll nur dann disabled sein, wenn es wirklich schon fertig eingerichtet ist
  const canEnable = supported && !fullySetup && permission !== 'denied';

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group>
          <IconBell size={18} />
          <Text fw={600}>Schicht-Erinnerungen aktivieren</Text>
        </Group>
      }
      centered
    >
      <Stack gap="sm">
        <Text c="dimmed">
          Wir senden dir <b>10 Minuten vor Schichtbeginn</b> und ggf.{' '}
          <b>direkt nach Beginn</b> (falls noch nicht eingestempelt) eine
          Erinnerung.
        </Text>
        <Text c="dimmed">
          Du kannst das jederzeit im Profil wieder deaktivieren. Die Nachrichten
          kommen auch an, wenn der Tab geschlossen ist.
        </Text>

        <Group justify="flex-end" mt="sm">
          <Button
            variant="default"
            onClick={() => {
              snoozePushPrompt(24 * 60 * 60 * 1000); // 24h Snooze (anpassen nach Wunsch)
              onClose();
            }}
          >
            Später
          </Button>
          <Button
            leftSection={<IconCheck size={16} />}
            loading={busy}
            disabled={!canEnable}
            onClick={async () => {
              setBusy(true);
              try {
                const ok = await register(); // holt ggf. Permission ODER nur Token
                await refresh(); // prefs/hasToken neu einlesen
                if (ok) {
                  markPushPromptDone();
                  onClose();
                }
              } finally {
                setBusy(false);
              }
            }}
          >
            {fullySetup ? 'Bereit' : 'Benachrichtigungen aktivieren'}
          </Button>
        </Group>

        {!supported && (
          <Text c="red">Dein Browser/Device unterstützt Web-Push nicht.</Text>
        )}
        {supported && permission === 'denied' && (
          <Text c="red">
            Benachrichtigungen sind im Browser blockiert. Bitte in den
            Site-Einstellungen freigeben.
          </Text>
        )}
      </Stack>
    </Modal>
  );
}
