import { useMemo, useState } from 'react';
import { Table, Button, Group, ActionIcon } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { Holiday } from '@/generated/prisma';
import { dateSortAsc, dateToHuman } from '@/lib/dates';
import HolidaysModal from './modal';
import axios from 'axios';
import { showSuccess } from '@/lib/toast';

export default function HolidaysSection({
  items,
  onCreate,
  onDelete,
}: {
  items: Holiday[];
  onCreate: (h: Holiday) => void;
  onDelete: (id: string) => void;
}) {
  const [opened, { open, close }] = useDisclosure(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...items].sort((a, b) => dateSortAsc(a.date, b.date)),
    [items]
  );

  async function handleCreate(holidays: { date: string; name: string }[]) {
    const { data } = await axios.post<Holiday[]>('/api/holidays', holidays);
    data.forEach((h) => onCreate(h));
    showSuccess(data.length == 1 ? 'Feiertag erstellt' : 'Feiertage erstellt');
    close();
  }

  async function handleDelete(id: string) {
    setIsDeleting(id);
    await axios.delete(`/api/holidays?id=${id}`);
    setIsDeleting(null);
    onDelete(id);
  }

  return (
    <div>
      <Group justify="space-between" className="mb-3">
        <h2 className="text-lg font-semibold">Feiertage</h2>
        <Button leftSection={<IconPlus size={16} />} onClick={open}>
          Feiertag hinzufügen
        </Button>
      </Group>

      <div className="rounded-xl border overflow-hidden">
        <Table striped withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Datum</Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>Aktionen</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sorted.map((h) => (
              <Table.Tr key={h.id}>
                <Table.Td className="whitespace-nowrap">
                  {dateToHuman(h.date)}
                </Table.Td>
                <Table.Td>{h.name}</Table.Td>
                <Table.Td>
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    loading={isDeleting === h.id}
                    onClick={() => handleDelete(h.id)}
                    aria-label="Löschen"
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </div>

      <HolidaysModal
        opened={opened}
        onClose={close}
        onCreate={handleCreate}
        existing={sorted}
      />
    </div>
  );
}
