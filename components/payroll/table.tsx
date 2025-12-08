import React, { useState } from 'react';
import {
  Card,
  Group,
  Text,
  Table,
  Collapse,
  Badge,
  Loader,
} from '@mantine/core';
import { PayrollRow } from '@/lib/payroll';
import { minutesToRoundedHours, timeToHuman } from '@/lib/dates';

function Euro(cents?: number | null) {
  if (!cents) return '—';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

export default function PayrollTable({
  year,
  month,
  loading,
  rows,
}: {
  year: number;
  month: number;
  loading: boolean;
  rows: PayrollRow[];
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  function monthLabel(y: number, m: number) {
    return new Date(y, m, 1).toLocaleDateString('de', {
      month: 'long',
      year: 'numeric',
    });
  }

  return (
    <Card withBorder radius="lg" p="lg">
      <Group justify="space-between" mb="sm">
        <Text fw={600}>{monthLabel(year, month)}</Text>
        {loading && <Loader size="sm" />}
      </Group>

      <div className="rounded-xl border overflow-hidden">
        <Table striped withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Mitarbeiter</Table.Th>
              <Table.Th>Grundgehalt</Table.Th>
              <Table.Th>Grundvergütung (Std)</Table.Th>
              <Table.Th>Basis-Stundensatz</Table.Th>
              <Table.Th>Gesamtstunden</Table.Th>
              <Table.Th>Zuschläge</Table.Th>
              <Table.Th>Urlaubs- /Weihnachtsgeld</Table.Th>
              <Table.Th>Brutto gesamt</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((r) => (
              <React.Fragment key={r.userId}>
                <Table.Tr
                  className="cursor-pointer"
                  onClick={() =>
                    setOpen((o) => ({ ...o, [r.userId]: !o[r.userId] }))
                  }
                >
                  <Table.Td className="font-medium">{r.userName}</Table.Td>
                  <Table.Td>{Euro(r.baseSalaryCents)}</Table.Td>
                  <Table.Td>{Euro(r.baseFromHoursCents)}</Table.Td>
                  <Table.Td>
                    {r.baseHourlyCents ? Euro(r.baseHourlyCents) : '—'}
                  </Table.Td>
                  <Table.Td>{(r.monthMinutes / 60).toFixed(1)} h</Table.Td>
                  <Table.Td>{Euro(r.supplementsTotalCents)}</Table.Td>
                  <Table.Td>{Euro(r.bonus?.amountCents)}</Table.Td>
                  <Table.Td className="font-semibold">
                    {Euro(r.grossCents)}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td colSpan={8} className="!p-0 bg-slate-50">
                    <Collapse in={!!open[r.userId]}>
                      <SupplementsTable supplements={r.supplementsByRule} />
                    </Collapse>
                  </Table.Td>
                </Table.Tr>
              </React.Fragment>
            ))}
          </Table.Tbody>
        </Table>
      </div>
    </Card>
  );
}

function SupplementsTable({
  supplements,
}: {
  supplements: PayrollRow['supplementsByRule'];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-3">
      <Text size="sm" c="dimmed" mb={6}>
        Zuschläge nach Regel
      </Text>
      {supplements.length === 0 ? (
        <Text size="sm" c="dimmed">
          Keine Zuschläge
        </Text>
      ) : (
        <Table withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Regel</Table.Th>
              <Table.Th>Stunden</Table.Th>
              <Table.Th>Faktor</Table.Th>
              <Table.Th>Betrag</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {supplements.map((b) => (
              <React.Fragment key={b.ruleId}>
                <Table.Tr onClick={() => setOpen((o) => !o)}>
                  <Table.Td>{b.name}</Table.Td>
                  <Table.Td>{minutesToRoundedHours(b.minutes)} Std.</Table.Td>
                  <Table.Td>
                    <Badge>{b.percent}%</Badge>
                  </Table.Td>
                  <Table.Td>{Euro(b.amountCents)}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td colSpan={8} className="!p-0 bg-slate-50">
                    <Collapse in={open}>
                      <SupplementTriggerTable triggers={b.triggers} />
                    </Collapse>
                  </Table.Td>
                </Table.Tr>
              </React.Fragment>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </div>
  );
}

function SupplementTriggerTable({
  triggers,
}: {
  triggers: PayrollRow['supplementsByRule'][number]['triggers'];
}) {
  return (
    <div className="p-3 bg-amber-50">
      <Text size="sm" c="dimmed" mb={6}>
        Auflistung der betroffenen Tage
      </Text>
      {triggers.length === 0 ? (
        <Text size="sm" c="dimmed">
          Keine Daten
        </Text>
      ) : (
        <Table withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Datum</Table.Th>
              <Table.Th>Von</Table.Th>
              <Table.Th>Bis</Table.Th>
              <Table.Th ta="right">Minuten</Table.Th>
              <Table.Th ta="right">Stunden</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {triggers
              .sort((a, b) => a.from.localeCompare(b.from))
              .map((t) => (
                <Table.Tr key={`${t.from}`}>
                  <Table.Td>{t.day}</Table.Td>
                  <Table.Td>{timeToHuman(new Date(t.from))}</Table.Td>
                  <Table.Td>{timeToHuman(new Date(t.to))}</Table.Td>
                  <Table.Td ta="right">{t.minutes} min</Table.Td>
                  <Table.Td ta="right">{t.minutes / 60} Std.</Table.Td>
                </Table.Tr>
              ))}
          </Table.Tbody>
        </Table>
      )}
    </div>
  );
}
