import { useMemo, useState } from 'react';
import {
  Card,
  Table,
  Group,
  Button,
  Badge,
  ActionIcon,
  Text,
} from '@mantine/core';
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';
import axios from 'axios';
import { minToHHMM, WEEKDAY_OPTIONS } from '@/lib/dates';
import { dateToHuman } from '@/lib/dates';
import type { PayRule, User } from '@/generated/prisma';
import RuleModal from '../settings/paymentRules/modal';

function Fenster({ s, e }: { s: number | null; e: number | null }) {
  if (s == null || e == null) return <>ganztägig</>;
  return (
    <>
      {minToHHMM(s)}-{minToHHMM(e)}
    </>
  );
}

export default function PayRulesSection({
  user,
  onLocalChange, // (newRules) => void  (optimistic UI)
}: {
  user: User & { payRules: PayRule[] };
  onLocalChange: (next: PayRule[]) => void;
}) {
  const [opened, setOpened] = useState(false);
  const [edit, setEdit] = useState<PayRule | null>(null);

  const rules = user.payRules || [];
  const now = new Date();
  const { active, future, past } = useMemo(() => {
    const byFrom = [...(rules || [])].sort(
      (a, b) =>
        new Date(a.validFrom as any).getTime() -
        new Date(b.validFrom as any).getTime()
    );
    const active: PayRule[] = [];
    const future: PayRule[] = [];
    const past: PayRule[] = [];
    for (const r of byFrom) {
      const from = new Date(r.validFrom as any);
      const to = r.validUntil ? new Date(r.validUntil as any) : null;
      if (from <= now && (!to || to >= now)) active.push(r);
      else if (from > now) future.push(r);
      else past.push(r);
    }
    return { active, future, past };
  }, [rules]);

  function openCreate() {
    setEdit(null);
    setOpened(true);
  }
  function openEdit(rule: PayRule) {
    setEdit(rule);
    setOpened(true);
  }

  async function createRule(rule: PayRule) {
    onLocalChange([...(rules || []), rule]);
    setOpened(false);
  }
  async function updateRule(rule: PayRule) {
    onLocalChange((rules || []).map((x) => (x.id === rule.id ? rule : x)));
    setOpened(false);
  }
  async function deleteRule(id: string) {
    await axios.delete(`/api/users/${user.id}/pay-rules/${id}`);
    onLocalChange((rules || []).filter((x) => x.id !== id));
  }

  return (
    <Card withBorder radius="lg" p="md">
      <Group justify="space-between" mb="xs">
        <div className="font-semibold">Vereinbarte Zuschläge</div>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
          Zuschlag hinzufügen
        </Button>
      </Group>

      {rules.length === 0 ? (
        <Text c="dimmed">Keine Zuschläge vorhanden.</Text>
      ) : (
        <>
          <Section
            title="Aktive Regeln"
            items={active}
            onEdit={openEdit}
            onDelete={deleteRule}
          />
          <Section
            title="Zukünftige Regeln"
            items={future}
            onEdit={openEdit}
            onDelete={deleteRule}
          />
          <Section
            title="Abgelaufene Regeln"
            items={past}
            onEdit={openEdit}
            onDelete={deleteRule}
          />
        </>
      )}

      {/* Modal: Create/Edit */}
      {opened && (
        <RuleModal
          opened={opened}
          onClose={() => setOpened(false)}
          // Beim Erstellen: user gelockt, validFrom default=heute, validUntil leer
          initial={
            edit ??
            ({
              userId: user.id,
              name: '',
              windowStartMin: null,
              windowEndMin: null,
              daysOfWeek: [],
              holidayOnly: false,
              excludeHolidays: false,
              validFrom: new Date().toISOString(),
              validUntil: null,
              percent: null,
              createdAt: new Date().toISOString(),
            } as any)
          }
          users={[
            { id: user.id, firstName: user.firstName, lastName: user.lastName },
          ]} // Select ist gelockt im Modal
          defaultUserId={user.id}
          onSubmit={(rule) => (edit ? updateRule(rule) : createRule(rule))}
          mode={edit ? 'edit' : 'create'}
        />
      )}
    </Card>
  );
}

/* ---------- Untertabelle ---------- */
function Section({
  title,
  items,
  onEdit,
  onDelete,
}: {
  title: string;
  items: PayRule[];
  onEdit: (r: PayRule) => void;
  onDelete: (id: string) => void;
}) {
  if (!items.length) return null;
  return (
    <div className="mt-4">
      <div className="text-sm font-semibold mb-2">{title}</div>
      <div className="rounded-xl border overflow-hidden">
        <Table striped withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Gültigkeit</Table.Th>
              <Table.Th>Fenster</Table.Th>
              <Table.Th>Tage</Table.Th>
              <Table.Th>FT</Table.Th>
              <Table.Th>%</Table.Th>
              <Table.Th>Aktionen</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map((r) => (
              <Table.Tr key={r.id}>
                <Table.Td className="font-medium">{r.name}</Table.Td>
                <Table.Td className="whitespace-nowrap">
                  {dateToHuman(r.validFrom)} -{' '}
                  {r.validUntil ? dateToHuman(r.validUntil) : 'offen'}
                </Table.Td>
                <Table.Td>
                  <Fenster
                    s={r.windowStartMin ?? null}
                    e={r.windowEndMin ?? null}
                  />
                </Table.Td>
                <Table.Td className="whitespace-nowrap">
                  {r.daysOfWeek.length
                    ? r.daysOfWeek
                        .map(
                          (d) =>
                            WEEKDAY_OPTIONS.find((w) => w.value === String(d))
                              ?.label || d
                        )
                        .join(', ')
                    : 'alle'}
                </Table.Td>
                <Table.Td>
                  {r.holidayOnly ? (
                    <Badge color="blue">nur FT</Badge>
                  ) : r.excludeHolidays ? (
                    <Badge color="gray">ohne FT</Badge>
                  ) : (
                    '± FT'
                  )}
                </Table.Td>
                <Table.Td>
                  {r.percent != null ? Number(r.percent as any) : '—'}
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon
                      variant="subtle"
                      onClick={() => onEdit(r)}
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
            ))}
          </Table.Tbody>
        </Table>
      </div>
    </div>
  );
}
