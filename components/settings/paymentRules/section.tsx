import React, { useMemo, useState } from 'react';
import { Table, Button, Group, ActionIcon, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconPlus,
  IconTrash,
  IconEdit,
  IconInfoCircle,
} from '@tabler/icons-react';
import { minToHHMM, WEEKDAY_LABEL } from '@/lib/dates';
import RuleModal from './modal';
import { ApiGetPayRulesResponse } from '@/pages/api/payRules';

export default function RulesSection({
  rules,
  onCreate,
  onUpdate,
  onDelete,
}: {
  rules: ApiGetPayRulesResponse;
  onCreate: (r: ApiGetPayRulesResponse[number]) => void;
  onUpdate: (r: ApiGetPayRulesResponse[number]) => void;
  onDelete: (id: string) => void;
}) {
  const [opened, { open, close }] = useDisclosure(false);
  const [edit, setEdit] = useState<ApiGetPayRulesResponse[number] | null>(null);

  const users = useMemo(() => {
    const map = new Map<
      string,
      { id: string } & (typeof rules)[number]['user']
    >();
    for (const r of rules) map.set(r.userId, { id: r.userId, ...r.user });
    return Array.from(map.values());
  }, [rules]);

  const sorted = useMemo(() => [...rules], [rules]);

  return (
    <div>
      <Group justify="space-between" className="mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Zuschläge</h2>
          <Tooltip label="Zeitfenster können über Mitternacht laufen (z. B. 22:00-06:00)">
            <span>
              <IconInfoCircle size={16} />
            </span>
          </Tooltip>
        </div>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => {
            setEdit(null);
            open();
          }}
        >
          Neue Regel
        </Button>
      </Group>

      <div className="rounded-xl border overflow-hidden">
        <Table striped withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Fenster</Table.Th>
              <Table.Th>Tage</Table.Th>
              <Table.Th>Feiertag</Table.Th>
              <Table.Th ta="right">Zuschlag</Table.Th>
              <Table.Th>Mitarbeiter</Table.Th>
              <Table.Th>Aktionen</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sorted.map((r) => {
              const win =
                r.windowStartMin == null || r.windowEndMin == null
                  ? 'ganztägig'
                  : `${minToHHMM(r.windowStartMin)}-${minToHHMM(
                      r.windowEndMin
                    )}`;
              const days = r.daysOfWeek.length
                ? r.daysOfWeek.map((d) => WEEKDAY_LABEL(d)).join(', ')
                : r.holidayOnly
                ? '—'
                : 'alle';
              const ft = r.holidayOnly
                ? 'nur FT'
                : r.excludeHolidays
                ? 'ohne FT'
                : '± FT';
              const z = r.percent != null ? `${r.percent}%` : '—';
              return (
                <Table.Tr key={r.id}>
                  <Table.Td>{r.name}</Table.Td>
                  <Table.Td className="whitespace-nowrap">{win}</Table.Td>
                  <Table.Td className="whitespace-nowrap">{days}</Table.Td>
                  <Table.Td>{ft}</Table.Td>
                  <Table.Td className="text-right">{z}</Table.Td>
                  <Table.Td>
                    {r.user ? (
                      `${r.user.firstName} ${r.user.lastName}`
                    ) : (
                      <span className="text-slate-400 text-sm">–</span>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon
                        variant="subtle"
                        onClick={() => {
                          setEdit(r);
                          open();
                        }}
                        aria-label="Bearbeiten"
                      >
                        <IconEdit size={18} />
                      </ActionIcon>
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => onDelete(r.id)}
                        aria-label="Löschen"
                      >
                        <IconTrash size={18} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </div>

      <RuleModal
        opened={opened}
        onClose={close}
        initial={edit || undefined}
        onSubmit={(rule) => {
          if (edit) onUpdate(rule);
          else onCreate(rule);
          close();
        }}
        users={users}
        mode={edit ? 'edit' : 'create'}
      />
    </div>
  );
}
