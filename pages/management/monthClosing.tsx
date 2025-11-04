import { useEffect, useState } from 'react';
import { Group, Title, Select, Center, Loader } from '@mantine/core';
import { IconCalendar } from '@tabler/icons-react';
import axios from 'axios';
import ManagementLayout from '@/layouts/managementLayout';
import { ApiGetSimpleUsersResponse } from '../api/users';
import { ApiGetShiftsResponse } from '../api/shifts';
import { dateToISO } from '@/lib/dates';
import { ChangeStatus, AbsenceReason } from '@/generated/prisma';
import MonthClosingGrid from '@/components/monthClosing/grid';

export type MonthClosingShift = {
  id: string;
  start: Date;
  end: Date;
  clockIn: Date | null;
  clockOut: Date | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
  code: {
    id: string;
    code: string;
    label: string;
    color: string;
  };
  shiftAbsence: {
    status: ChangeStatus;
    reason: AbsenceReason;
  } | null;
};

export default function MonthClosingPage() {
  // Monat wählen
  const today = new Date();
  const [year, setYear] = useState<number>(today.getFullYear());
  const [month, setMonth] = useState<number>(today.getMonth() - 1); // 0-basiert

  const [shifts, setShifts] = useState<MonthClosingShift[]>([]);

  // Daten
  const [loading, setLoading] = useState(true);

  // laden
  useEffect(() => {
    async function load() {
      setLoading(true);
      const [{ data: emps }, { data: sh }] = await Promise.all([
        axios.get<ApiGetSimpleUsersResponse>('/api/users?simple=true'),
        axios.get<ApiGetShiftsResponse>('/api/shifts', {
          params: {
            from: dateToISO(new Date(year, month, 1)),
            to: dateToISO(new Date(year, month + 1, 2)),
          },
        }),
      ]);
      const shfts = sh.map((s) => ({
        ...s,
        user: emps.find((e) => e.id === s.userId),
      })) as MonthClosingShift[];
      setShifts(shfts);
      setLoading(false);
    }
    load();
  }, [year, month]);

  function handleUpdate(s: MonthClosingShift, del?: boolean) {
    if (del) {
      setShifts((prev) => prev.filter((p) => p.id !== s.id));
    } else {
      setShifts((prev) =>
        prev.map((p) => {
          if (s.id == p.id) return { ...p, ...s };
          return p;
        })
      );
    }
  }

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
          <Title order={2}>Monatsabschluss</Title>
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
          </Group>
        </Group>
        {loading ? (
          <Center>
            <Loader />
          </Center>
        ) : (
          <MonthClosingGrid
            year={year}
            month={month}
            shifts={shifts}
            onUpdate={handleUpdate}
          />
        )}
      </div>
    </ManagementLayout>
  );
}
