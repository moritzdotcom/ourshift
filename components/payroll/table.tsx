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
                      <div className="p-3">
                        <Text size="sm" c="dimmed" mb={6}>
                          Zuschläge nach Regel
                        </Text>
                        {r.supplementsByRule.length === 0 ? (
                          <Text size="sm" c="dimmed">
                            Keine Zuschläge
                          </Text>
                        ) : (
                          <Table withTableBorder>
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th>Regel</Table.Th>
                                <Table.Th>Minuten</Table.Th>
                                <Table.Th>Faktor</Table.Th>
                                <Table.Th>Betrag</Table.Th>
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {r.supplementsByRule.map((b) => (
                                <Table.Tr key={b.ruleId}>
                                  <Table.Td>{b.name}</Table.Td>
                                  <Table.Td>{b.minutes} min</Table.Td>
                                  <Table.Td>
                                    <Badge>{b.percent}%</Badge>
                                  </Table.Td>
                                  <Table.Td>{Euro(b.amountCents)}</Table.Td>
                                </Table.Tr>
                              ))}
                            </Table.Tbody>
                          </Table>
                        )}
                      </div>
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
