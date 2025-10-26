import React from 'react';
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

// Optional: Systemschrift sauber setzen (nicht zwingend)
const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 10, color: '#111827' },
  header: { marginBottom: 16 },
  title: { fontSize: 16, fontWeight: 600 },
  sub: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  section: { marginTop: 8, marginBottom: 8 },
  kpiRow: { flexDirection: 'row', gap: 8 },
  kpi: { flex: 1, border: '1px solid #e5e7eb', borderRadius: 6, padding: 8 },
  kpiLabel: { color: '#6B7280', marginBottom: 2 },
  kpiValue: { fontSize: 12, fontWeight: 600 },

  table: {
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderColor: '#e5e7eb',
  },
  tr: { flexDirection: 'row' },
  th: { fontWeight: 600, backgroundColor: '#F9FAFB' },
  cell: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#e5e7eb',
    padding: 6,
  },
  // Spaltenbreiten (leicht flexibel)
  colName: { width: '26%' },
  colMoney: { width: '14%', textAlign: 'right' },
  colHours: { width: '10%', textAlign: 'right' },

  // Breakdown
  userBlock: {
    marginTop: 12,
    marginBottom: 8,
    pageBreakInside: 'avoid',
  },
  userHeader: { fontSize: 12, fontWeight: 600, marginBottom: 6 },
  caption: { fontSize: 9, color: '#6B7280', marginTop: 2 },

  footer: {
    position: 'absolute',
    fontSize: 9,
    color: '#9CA3AF',
    left: 28,
    right: 28,
    bottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

function Euro(cents?: number | null) {
  if (!cents) return '—';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

type SupplementsRow = {
  ruleId: string;
  name: string;
  minutes: number;
  amountCents: number;
  percent: number;
};

export type PayrollRow = {
  userId: string;
  userName: string;
  monthMinutes: number;
  baseSalaryCents: number;
  baseHourlyCents: number | null;
  baseFromHoursCents: number; // bei Stundenlohn
  supplementsByRule: SupplementsRow[];
  supplementsTotalCents: number;
  grossCents: number;
};

export default function PayrollPDFDocument({
  rows,
  monthLabel,
  companyName,
  generatedAt = new Date(),
}: {
  rows: PayrollRow[];
  monthLabel: string;
  companyName?: string;
  generatedAt?: Date;
}) {
  const totalHours = rows.reduce((a, r) => a + r.monthMinutes, 0) / 60;
  const totalGross = rows.reduce((a, r) => a + r.grossCents, 0);
  const activeUsers = rows.length;

  return (
    <Document title={`Lohnabrechnung ${monthLabel}`}>
      <Page size="A4" style={styles.page} wrap>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Lohnabrechnung - {monthLabel}</Text>
          <Text style={styles.sub}>
            {companyName || '—'} · Generiert am{' '}
            {generatedAt.toLocaleDateString('de-DE')} um{' '}
            {generatedAt.toLocaleTimeString('de-DE', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        {/* KPIs */}
        <View style={[styles.section, styles.kpiRow]}>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Aktive Mitarbeiter</Text>
            <Text style={styles.kpiValue}>{activeUsers}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Gesamtstunden</Text>
            <Text style={styles.kpiValue}>{totalHours.toFixed(1)} h</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Bruttolohn (Summe)</Text>
            <Text style={styles.kpiValue}>{Euro(totalGross)}</Text>
          </View>
        </View>

        {/* Haupttabelle (Summen je Mitarbeiter) */}
        <View style={[styles.section, styles.table]}>
          <View style={[styles.tr, styles.th]}>
            <Text style={[styles.cell, styles.colName]}>Mitarbeiter</Text>
            <Text style={[styles.cell, styles.colMoney]}>Grundgehalt</Text>
            <Text style={[styles.cell, styles.colMoney]}>Grund (Std)</Text>
            <Text style={[styles.cell, styles.colMoney]}>Basis-Satz</Text>
            <Text style={[styles.cell, styles.colHours]}>Std.</Text>
            <Text style={[styles.cell, styles.colMoney]}>Zuschläge</Text>
            <Text style={[styles.cell, styles.colMoney]}>Brutto</Text>
          </View>

          {rows.map((r) => (
            <View key={r.userId} style={styles.tr} wrap={false}>
              <Text style={[styles.cell, styles.colName]}>{r.userName}</Text>
              <Text style={[styles.cell, styles.colMoney]}>
                {Euro(r.baseSalaryCents)}
              </Text>
              <Text style={[styles.cell, styles.colMoney]}>
                {Euro(r.baseFromHoursCents)}
              </Text>
              <Text style={[styles.cell, styles.colMoney]}>
                {r.baseHourlyCents ? Euro(r.baseHourlyCents) : '—'}
              </Text>
              <Text style={[styles.cell, styles.colHours]}>
                {(r.monthMinutes / 60).toFixed(1)}
              </Text>
              <Text style={[styles.cell, styles.colMoney]}>
                {Euro(r.supplementsTotalCents)}
              </Text>
              <Text style={[styles.cell, styles.colMoney]}>
                {Euro(r.grossCents)}
              </Text>
            </View>
          ))}
        </View>

        {/* Breakdown je Mitarbeiter (Seitenumbruch-freundlich) */}
        {rows.map((r) => (
          <View
            key={`detail-${r.userId}`}
            style={styles.userBlock}
            wrap={false}
          >
            <Text style={styles.userHeader}>{r.userName}</Text>
            {r.supplementsByRule.length === 0 ? (
              <Text style={styles.caption}>Keine Zuschläge</Text>
            ) : (
              <View style={styles.table}>
                <View style={[styles.tr, styles.th]}>
                  <Text style={[styles.cell, { width: '46%' }]}>Regel</Text>
                  <Text
                    style={[styles.cell, { width: '18%', textAlign: 'right' }]}
                  >
                    Minuten
                  </Text>
                  <Text
                    style={[styles.cell, { width: '18%', textAlign: 'right' }]}
                  >
                    Faktor
                  </Text>
                  <Text
                    style={[styles.cell, { width: '18%', textAlign: 'right' }]}
                  >
                    Betrag
                  </Text>
                </View>
                {r.supplementsByRule.map((b) => (
                  <View key={b.ruleId} style={styles.tr} wrap={false}>
                    <Text style={[styles.cell, { width: '46%' }]}>
                      {b.name}
                    </Text>
                    <Text
                      style={[
                        styles.cell,
                        { width: '18%', textAlign: 'right' },
                      ]}
                    >
                      {b.minutes.toFixed(0)}
                    </Text>
                    <Text
                      style={[
                        styles.cell,
                        { width: '18%', textAlign: 'right' },
                      ]}
                    >
                      {b.percent.toFixed(2)}%
                    </Text>
                    <Text
                      style={[
                        styles.cell,
                        { width: '18%', textAlign: 'right' },
                      ]}
                    >
                      {Euro(b.amountCents)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Lohnabrechnung - {monthLabel}</Text>
          <Text>
            Seite{' '}
            <Text
              render={({ pageNumber, totalPages }) =>
                `${pageNumber}/${totalPages}`
              }
            />
          </Text>
        </View>
      </Page>
    </Document>
  );
}
