import React from 'react';
import { Table } from '@mantine/core';
import { IconGripHorizontal } from '@tabler/icons-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function SortableRow({
  id,
  children,
  dragHandleClass = 'cursor-grab',
}: {
  id: string;
  children: React.ReactNode;
  dragHandleClass?: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  // Transform auf die <tr> anwenden (dnd-kit macht smooth Transitions)
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Während Drag visuell abheben:
    zIndex: isDragging ? 2 : undefined,
    position: isDragging ? 'relative' : undefined,
    boxShadow: isDragging ? '0 6px 20px rgba(0,0,0,0.12)' : undefined,
    background: isDragging ? 'var(--mantine-color-body)' : undefined,
  };

  return (
    <Table.Tr ref={setNodeRef} style={style}>
      {/* Erste Zelle: Grip + Drag listeners */}
      <Table.Td width={10} className="text-slate-400">
        <span
          {...attributes}
          {...listeners}
          className={dragHandleClass}
          title="Ziehen zum Sortieren"
          aria-label="Reihe ziehen"
        >
          <IconGripHorizontal />
        </span>
      </Table.Td>
      {children}
    </Table.Tr>
  );
}
