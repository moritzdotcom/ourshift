import React, { useEffect, useMemo, useState } from 'react';
import { Group, Title, Button, Select } from '@mantine/core';
import { IconDownload, IconCalendar } from '@tabler/icons-react';
import axios from 'axios';
import ManagementLayout from '@/layouts/managementLayout';
import PayrollPDFDocument from '@/components/payroll/payrollPdf';
import { downloadCSV } from '@/lib/payroll';
import PayrollTable from '@/components/payroll/table';
import PayrollKpiCards from '@/components/payroll/kpiCards';
import { PayrollPayload } from '@/lib/kpiCache/payroll';

export default function PayrollPage() {
  // Monat wählen
  const today = new Date();
  const [year, setYear] = useState<number>(today.getFullYear());
  const [month, setMonth] = useState<number>(today.getMonth()); // 0-basiert

  // Daten
  const [loading, setLoading] = useState(true);
  const [payrollPayload, setPayrollPayload] = useState<PayrollPayload>();

  // laden
  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await axios.get<PayrollPayload>(
        `/api/payroll/summary?y=${year}&m=${month}`
      );
      setPayrollPayload(data);
      setLoading(false);
    }
    load();
  }, [year, month]);

  const pdfDoc = useMemo(
    () => (
      <PayrollPDFDocument
        rows={payrollPayload || []}
        monthLabel={monthLabel(year, month)}
        companyName="Dein Unternehmen"
      />
    ),
    [payrollPayload, year, month]
  );

  function monthLabel(y: number, m: number) {
    return new Date(y, m, 1).toLocaleDateString('de', {
      month: 'long',
      year: 'numeric',
    });
  }

  return (
    <ManagementLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <Group justify="space-between">
          <Title order={2}>Lohnbuchhaltung</Title>
          <Group>
            {/* Monat/Jahr Auswahl */}
            <Select
              leftSection={<IconCalendar size={16} />}
              value={`${year}-${month}`}
              data={Array.from({ length: 24 }).map((_, i) => {
                const d = new Date();
                d.setDate(15);
                d.setMonth(d.getMonth() - i);
                return {
                  value: `${d.getFullYear()}-${d.getMonth()}`,
                  label: monthLabel(d.getFullYear(), d.getMonth()),
                };
              })}
              onChange={(val) => {
                if (!val) return;
                const [y, m] = val.split('-').map(Number);
                setYear(y);
                setMonth(m);
              }}
            />
            <Button
              leftSection={<IconDownload size={16} />}
              onClick={() =>
                downloadCSV(
                  `payroll_${year}-${String(month + 1).padStart(2, '0')}.csv`,
                  payrollPayload || []
                )
              }
              loading={!payrollPayload}
            >
              CSV exportieren
            </Button>
          </Group>
        </Group>

        <PayrollKpiCards rows={payrollPayload || []} />

        <PayrollTable
          year={year}
          month={month}
          loading={loading}
          rows={payrollPayload || []}
        />
      </div>
    </ManagementLayout>
  );
}
