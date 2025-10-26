import { ShiftCode } from '@/generated/prisma';
import React, { useMemo, useState } from 'react';
import { Table, Button, Group, ActionIcon } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconTrash, IconEdit } from '@tabler/icons-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { reorder } from '@/lib/draggable';
import SortableRow from './sortableRow';
import { minToHHMM } from '@/lib/dates';
import ShiftCodeModal from './modal';
import axios from 'axios';
import { showSuccess } from '@/lib/toast';

export default function ShiftCodesSection({
  items,
  onCreate,
  onUpdate,
  onDelete,
  setShiftCodes,
}: {
  items: ShiftCode[];
  onCreate: (s: ShiftCode) => void;
  onUpdate: (s: ShiftCode) => void;
  onDelete: (id: string) => void;
  setShiftCodes: React.Dispatch<React.SetStateAction<ShiftCode[]>>;
}) {
  const [opened, { open, close }] = useDisclosure(false);
  const [edit, setEdit] = useState<ShiftCode | null>(null);
  const sorted = useMemo(
    () => [...items].sort((a, b) => a.sortOrder - b.sortOrder),
    [items]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  function changedOnly(prev: ShiftCode[], next: ShiftCode[]) {
    const map = new Map(prev.map((x) => [x.id, x.sortOrder]));
    return next
      .map((x, i) => ({ id: x.id, sortOrder: i }))
      .filter((row) => map.get(row.id) !== row.sortOrder);
  }

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const next = reorder(sorted, active.id, over.id, (x) => x.id);

    // Reihenfolge im State aktualisieren
    setShiftCodes(() => {
      // sortOrder neu schreiben (0..n) – optional: in 10er Schritten
      return next.map((x, i) => ({ ...x, sortOrder: i }));
    });

    // Reihenfolge in DB speichern
    const payload = changedOnly(sorted, next);
    if (payload.length) {
      axios.put('/api/shiftCodes/reorder', payload).then(() => {
        console.log('Reorder saved');
      });
    }
  }

  async function handleCreate(s: ShiftCode) {
    const { data } = await axios.post<ShiftCode>('/api/shiftCodes', s);
    showSuccess('Schicht-Typ erstellt');
    onCreate(data);
  }

  async function handleUpdate(s: ShiftCode) {
    const { data } = await axios.put<ShiftCode>(`/api/shiftCodes/${s.id}`, s);
    showSuccess('Änderungen gespeichert');
    onUpdate(data);
  }

  async function handleDelete(id: string) {
    await axios.delete(`/api/shiftCodes/${id}`);
    showSuccess('Schicht-Typ gelöscht');
    onDelete(id);
  }

  return (
    <div>
      <Group justify="space-between" className="mb-3">
        <h2 className="text-lg font-semibold">Schicht-Typen</h2>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => {
            setEdit(null);
            open();
          }}
        >
          Neuer Typ
        </Button>
      </Group>

      <div className="rounded-xl border overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <Table striped withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th></Table.Th>
                <Table.Th>Code</Table.Th>
                <Table.Th>Bezeichnung</Table.Th>
                <Table.Th>Zeit</Table.Th>
                <Table.Th className="text-center">Farbe</Table.Th>
                <Table.Th>Aktionen</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <SortableContext
              items={sorted.map((x) => x.id)}
              strategy={verticalListSortingStrategy}
            >
              <Table.Tbody>
                {sorted.map((x) => (
                  <SortableRow key={x.id} id={x.id}>
                    <Table.Td className="font-semibold">{x.code}</Table.Td>
                    <Table.Td>
                      <div className="flex flex-col">
                        <span>{x.label}</span>
                        {x.description && (
                          <span className="text-xs text-slate-500">
                            {x.description}
                          </span>
                        )}
                      </div>
                    </Table.Td>
                    <Table.Td>
                      {minToHHMM(x.windowStartMin ?? null)}-
                      {minToHHMM(x.windowEndMin ?? null)}
                    </Table.Td>
                    <Table.Td className="text-center">
                      <div
                        className={`shift-code-${x.color} w-fit px-2 py-1 rounded-md`}
                      >
                        {x.code}
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon
                          variant="subtle"
                          onClick={() => {
                            setEdit(x);
                            open();
                          }}
                          aria-label="Bearbeiten"
                        >
                          <IconEdit size={18} />
                        </ActionIcon>
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          onClick={() => handleDelete(x.id)}
                          aria-label="Löschen"
                        >
                          <IconTrash size={18} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </SortableRow>
                ))}
              </Table.Tbody>
            </SortableContext>
          </Table>
        </DndContext>
      </div>

      <ShiftCodeModal
        opened={opened}
        onClose={close}
        initial={edit || undefined}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
