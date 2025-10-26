import React, { useMemo, useState } from 'react';
import {
  Button,
  Group,
  Modal,
  TextInput,
  Tabs,
  Table,
  Alert,
  Loader,
} from '@mantine/core';
import { IconInfoCircle, IconUpload } from '@tabler/icons-react';
import { fetchPublicHolidays } from '@/lib/openHolidays';
import { dateToISO } from '@/lib/dates';

export default function HolidaysModal({
  opened,
  onClose,
  onCreate,
  existing = [],
}: {
  opened: boolean;
  onClose: () => void;
  onCreate: (h: { date: string; name: string }[]) => void;
  existing?: { date: Date | string; name: string }[];
}) {
  // --- Manuell
  const [date, setDate] = useState('');
  const [name, setName] = useState('');

  function handleCreate() {
    if (!date || !name) return;
    onCreate([{ date, name }]);
    setDate('');
    setName('');
  }

  // --- Import
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<
    { date: string; name: string }[] | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  // Dedupe: Set bereits existierender Datum-Keys
  const existingDates = useMemo(
    () => new Set(existing.map((h) => dateToISO(h.date))),
    [existing]
  );

  const previewWithFlags = useMemo(() => {
    if (!preview) return [];
    return preview.map((h) => ({
      ...h,
      isDuplicate: existingDates.has(dateToISO(h.date)),
    }));
  }, [preview, existingDates]);

  async function handlePreview() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetchPublicHolidays({
        from: from || undefined,
        to: to || undefined,
      });
      // Optional: Sortieren
      const sorted = [...res].sort((a, b) => a.date.localeCompare(b.date));
      setPreview(sorted);
    } catch (e: any) {
      setError(e?.message || 'Fehler beim Laden der Feiertage');
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }

  function handleImportNonDuplicates() {
    if (!preview) return;
    const uniques = preview.filter(
      (h) => !existingDates.has(dateToISO(h.date))
    );
    if (uniques.length === 0) return;
    onCreate(uniques);
    // Optional: Modal schließen oder Preview zurücksetzen
    // onClose();
    setPreview(null);
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Feiertage hinzufügen"
      size="lg"
    >
      <Tabs defaultValue="import">
        <Tabs.List grow>
          <Tabs.Tab value="import">Importieren</Tabs.Tab>
          <Tabs.Tab value="manual">Manuell</Tabs.Tab>
        </Tabs.List>

        {/* Manuell */}
        <Tabs.Panel value="manual" pt="md">
          <div className="grid grid-cols-1 gap-3">
            <TextInput
              label="Datum"
              type="date"
              value={date}
              onChange={(e) => setDate(e.currentTarget.value)}
              required
            />
            <TextInput
              label="Name"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              placeholder="z. B. Neujahr"
              required
            />
          </div>
          <Group justify="end" mt="md">
            <Button variant="default" onClick={onClose}>
              Abbrechen
            </Button>
            <Button onClick={handleCreate}>Speichern</Button>
          </Group>
        </Tabs.Panel>

        {/* Import */}
        <Tabs.Panel value="import" pt="md">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <TextInput
              label="Von"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.currentTarget.value)}
              placeholder="YYYY-MM-DD"
            />
            <TextInput
              label="Bis"
              type="date"
              value={to}
              onChange={(e) => setTo(e.currentTarget.value)}
              placeholder="YYYY-MM-DD"
            />
            <div className="flex items-end">
              <Button
                onClick={handlePreview}
                leftSection={
                  loading ? <Loader size="xs" /> : <IconUpload size={16} />
                }
              >
                {loading ? 'Laden…' : 'Vorschau laden'}
              </Button>
            </div>
          </div>

          {error && (
            <Alert
              mt="md"
              color="red"
              title="Fehler"
              icon={<IconInfoCircle size={16} />}
            >
              {error}
            </Alert>
          )}

          {preview && (
            <>
              <Alert
                mt="md"
                color="blue"
                variant="light"
                icon={<IconInfoCircle size={16} />}
              >
                Bereits vorhandene Feiertage sind <strong>markiert</strong> und
                werden beim Import übersprungen.
              </Alert>

              <div className="rounded-xl border overflow-hidden mt-3">
                <Table striped withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Datum</Table.Th>
                      <Table.Th>Name</Table.Th>
                      <Table.Th>Status</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {previewWithFlags.map((h) => (
                      <Table.Tr key={`${h.date}-${h.name}`}>
                        <Table.Td className="whitespace-nowrap">
                          {h.date}
                        </Table.Td>
                        <Table.Td>{h.name}</Table.Td>
                        <Table.Td
                          className={
                            h.isDuplicate
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }
                        >
                          {h.isDuplicate ? 'bereits vorhanden' : 'neu'}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </div>

              <Group justify="end" mt="md">
                <Button variant="default" onClick={onClose}>
                  Schließen
                </Button>
                <Button
                  onClick={handleImportNonDuplicates}
                  disabled={!previewWithFlags.some((h) => !h.isDuplicate)}
                >
                  {previewWithFlags.filter((v) => !v.isDuplicate).length}{' '}
                  Feiertage importieren
                </Button>
              </Group>
            </>
          )}
        </Tabs.Panel>
      </Tabs>
    </Modal>
  );
}
