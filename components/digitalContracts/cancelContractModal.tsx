// components/digitalContracts/cancelContractModal.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import {
  IconCalendarCancel,
  IconInfoCircle,
  IconTrash,
} from '@tabler/icons-react';
import { DigitalContract } from '@/generated/prisma';
import { dateToHuman, dateToISO } from '@/lib/dates';

export type CancelContractPayload = {
  terminationDate: string;
  deleteFutureShifts: boolean;
};

export default function CancelContractModal({
  opened,
  onClose,
  contract,
  loading = false,
  onSubmit,
}: {
  opened: boolean;
  onClose: () => void;
  contract: Partial<DigitalContract> | null;
  loading?: boolean;
  onSubmit: (payload: CancelContractPayload) => void | Promise<void>;
}) {
  const [terminationDate, setTerminationDate] = useState('');
  const [deleteFutureShifts, setDeleteFutureShifts] = useState(false);

  useEffect(() => {
    if (!opened) return;

    setTerminationDate(
      contract?.validUntil
        ? dateToISO(contract.validUntil)
        : dateToISO(new Date()),
    );
    setDeleteFutureShifts(false);
  }, [opened, contract]);

  const dateError = useMemo(() => {
    if (!terminationDate) {
      return 'Bitte ein Austrittsdatum auswählen.';
    }

    if (
      contract?.validFrom &&
      terminationDate < dateToISO(contract.validFrom)
    ) {
      return 'Das Austrittsdatum darf nicht vor dem Vertragsbeginn liegen.';
    }

    return null;
  }, [terminationDate, contract]);

  async function handleSubmit() {
    if (dateError) return;

    await onSubmit({
      terminationDate,
      deleteFutureShifts,
    });
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Arbeitsverhältnis beenden"
      size="md"
      closeOnClickOutside={!loading}
      closeOnEscape={!loading}
    >
      <Stack gap="md">
        <Alert
          variant="light"
          color="orange"
          icon={<IconInfoCircle size={16} />}
        >
          Der aktuelle Vertrag wird zum ausgewählten Datum beendet. Der
          Mitarbeiter bleibt bis einschließlich dieses Tages beschäftigt.
        </Alert>

        {contract?.validFrom && (
          <Text size="sm" c="dimmed">
            Vertragsbeginn: {dateToHuman(contract.validFrom)}
          </Text>
        )}

        <TextInput
          label="Austrittsdatum"
          description="Letzter Arbeitstag des Mitarbeiters"
          type="date"
          value={terminationDate}
          min={contract?.validFrom ? dateToISO(contract.validFrom) : undefined}
          onChange={(event) => setTerminationDate(event.currentTarget.value)}
          leftSection={<IconCalendarCancel size={16} />}
          error={dateError}
          required
        />

        <Checkbox
          checked={deleteFutureShifts}
          onChange={(event) =>
            setDeleteFutureShifts(event.currentTarget.checked)
          }
          label="Bereits geplante Schichten nach dem Austrittsdatum löschen"
          description="Schichten am letzten Arbeitstag bleiben bestehen. Gelöscht werden nur spätere Schichten."
        />

        {deleteFutureShifts && (
          <Alert variant="light" color="red" icon={<IconTrash size={16} />}>
            Diese Aktion löscht alle später geplanten Schichten des Mitarbeiters
            dauerhaft.
          </Alert>
        )}

        <Group justify="end" mt="xs">
          <Button variant="default" onClick={onClose} disabled={loading}>
            Abbrechen
          </Button>

          <Button
            color="red"
            onClick={handleSubmit}
            loading={loading}
            disabled={!!dateError}
          >
            Arbeitsverhältnis beenden
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
