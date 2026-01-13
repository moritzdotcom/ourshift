import axios from 'axios';
import useSWR from 'swr';
import { ApiGetSimpleUsersResponse } from '../api/users';
import ManagementLayout from '@/layouts/managementLayout';
import { Fragment, useMemo, useState } from 'react';
import { Anchor, Breadcrumbs, Button, Group, Stack, Text } from '@mantine/core';
import { IconPrinter } from '@tabler/icons-react';
import { ApiGetUserTimesheetResponse } from '../api/users/[userId]/timesheet';
import { isValid } from 'date-fns';

function fmtEuro(amount?: number | null) {
  if (amount == null) return '-';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function fmtHours(hours?: number | null) {
  if (hours == null) return '-';
  return new Intl.NumberFormat('de-DE', {
    style: 'unit',
    unit: 'hour',
  }).format(Number(hours.toFixed(1)));
}

function fmtTime(date: string | Date) {
  if (!isValid(new Date(date))) return '-';
  return new Date(date).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtCode(c: 'VACATION' | 'SICK' | null) {
  if (!c) return '';
  if (c === 'SICK') return 'Krank';
  if (c === 'VACATION') return 'Urlaub';
}

export default function TimeSheetsPage() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const fetcher = () =>
    axios
      .get<ApiGetSimpleUsersResponse>('/api/users?simple=true')
      .then((res) => res.data);

  const { data: users } = useSWR('/api/users?simple=true', fetcher);

  const selectedUser = users?.find((u) => u.id === selectedUserId) || null;

  const breadcrumbItems = useMemo(() => {
    const items = [
      {
        title: 'Stundenzettel',
        onClick: () => {
          setSelectedUserId(null);
          setSelectedYear(null);
          setSelectedMonth(null);
        },
      },
    ];
    if (selectedUser) {
      items.push({
        title: `${selectedUser.firstName} ${selectedUser.lastName}`,
        onClick: () => {
          setSelectedYear(null);
          setSelectedMonth(null);
        },
      });
    }
    if (selectedYear !== null) {
      items.push({
        title: selectedYear.toString(),
        onClick: () => setSelectedMonth(null),
      });
    }
    if (selectedMonth !== null) {
      const monthName = new Date(
        selectedYear!,
        selectedMonth,
        1
      ).toLocaleDateString('de-DE', {
        month: 'long',
      });
      items.push({ title: monthName, onClick: () => {} });
    }
    return items;
  }, [selectedUser, selectedYear, selectedMonth]);

  return (
    <ManagementLayout>
      {/* Global Print CSS direkt hier eingebaut */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 18mm;
          }

          /* Farben/Border sauber drucken */
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Alles ausblenden */
          body * {
            visibility: hidden;
          }

          /* Nur Print-Container sichtbar */
          .timesheet-print,
          .timesheet-print * {
            visibility: visible;
          }

          .timesheet-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }

          /* UI verstecken */
          .print-hidden {
            display: none !important;
          }

          /* Tabellen-Print Regeln */
          table {
            width: 100%;
            border-collapse: collapse;
            page-break-inside: auto;
          }

          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }

          tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          /* Unterschriftenbereich */
          .signature-grid {
            visibility: visible;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10mm;
            margin-top: 10mm;
          }
          .signature-line {
            border-top: 1px solid #000;
            padding-top: 2mm;
            font-size: 11px;
            color: #333;
          }
        }
        .signature-grid {
          visibility: hidden;
        }
      `}</style>

      <div className="w-full p-6">
        {/* Breadcrumbs NICHT drucken */}
        <div className="print-hidden">
          <Breadcrumbs>
            {breadcrumbItems.map((item, index) => (
              <Anchor key={index} onClick={item.onClick}>
                {item.title}
              </Anchor>
            ))}
          </Breadcrumbs>
        </div>

        <div className="mt-6">
          {!selectedUserId ? (
            <UserSelection onSelectUser={setSelectedUserId} users={users} />
          ) : selectedUser && selectedYear === null ? (
            <YearSelection user={selectedUser} onSelectYear={setSelectedYear} />
          ) : selectedUser &&
            selectedYear !== null &&
            selectedMonth === null ? (
            <MonthSelection
              user={selectedUser}
              year={selectedYear}
              onSelectMonth={setSelectedMonth}
            />
          ) : selectedUser &&
            selectedYear !== null &&
            selectedMonth !== null ? (
            <TimeSheetView
              user={selectedUser}
              year={selectedYear}
              month={selectedMonth}
            />
          ) : null}
        </div>
      </div>
    </ManagementLayout>
  );
}

function UserSelection({
  users,
  onSelectUser,
}: {
  users: ApiGetSimpleUsersResponse | undefined;
  onSelectUser: (userId: string) => void;
}) {
  return (
    <Stack maw={400}>
      <Text size="xl">Mitarbeiter wählen</Text>
      {users ? (
        users.map((user) => (
          <Button
            key={user.id}
            onClick={() => onSelectUser(user.id)}
            variant="light"
          >
            {user.firstName} {user.lastName}
          </Button>
        ))
      ) : (
        <Text>Lade Mitarbeiter…</Text>
      )}
    </Stack>
  );
}

function YearSelection({
  user,
  onSelectYear,
}: {
  user: NonNullable<ApiGetSimpleUsersResponse>[0];
  onSelectYear: (year: number) => void;
}) {
  const currentYear = new Date().getFullYear();
  const employmentStart = user.employmentStart
    ? new Date(user.employmentStart)
    : null;
  const employmentEnd = user.terminationDate
    ? new Date(user.terminationDate)
    : null;

  const years = [];
  for (let year = currentYear; year >= 2025; year--) {
    if (
      (!employmentStart || year >= employmentStart.getFullYear()) &&
      (!employmentEnd || year <= employmentEnd.getFullYear())
    ) {
      years.push(year);
    }
  }

  if (years.length === 0) {
    return <div>Keine verfügbaren Jahre für diesen Mitarbeiter.</div>;
  }
  if (years.length === 1) {
    onSelectYear(years[0]);
    return null;
  }
  return (
    <Stack maw={400}>
      <Text size="xl">Jahr wählen</Text>
      {years.map((year) => (
        <Button key={year} onClick={() => onSelectYear(year)} variant="light">
          {year}
        </Button>
      ))}
    </Stack>
  );
}

function MonthSelection({
  user,
  year,
  onSelectMonth,
}: {
  user: NonNullable<ApiGetSimpleUsersResponse>[0];
  year: number;
  onSelectMonth: (month: number) => void;
}) {
  const currentDate = new Date();
  const employmentStart = user.employmentStart
    ? new Date(user.employmentStart)
    : null;
  const employmentEnd = user.terminationDate
    ? new Date(user.terminationDate)
    : null;

  const months = [];
  for (let month = 11; month >= 0; month--) {
    const monthDate = new Date(year, month, 1);
    if (
      (!employmentStart ||
        monthDate >=
          new Date(
            employmentStart.getFullYear(),
            employmentStart.getMonth(),
            1
          )) &&
      (!employmentEnd ||
        monthDate <=
          new Date(employmentEnd.getFullYear(), employmentEnd.getMonth(), 1)) &&
      (year < currentDate.getFullYear() ||
        (year === currentDate.getFullYear() && month <= currentDate.getMonth()))
    ) {
      months.push(month);
    }
  }

  if (months.length === 0) {
    return (
      <div>Keine verfügbaren Monate für diesen Mitarbeiter im Jahr {year}.</div>
    );
  }
  if (months.length === 1) {
    onSelectMonth(months[0]);
    return null;
  }
  return (
    <Stack maw={400}>
      <Text size="xl">Monat wählen</Text>
      {months.map((month) => {
        const monthName = new Date(year, month, 1).toLocaleDateString('de-DE', {
          month: 'long',
          year: 'numeric',
        });
        return (
          <Button
            key={month}
            onClick={() => onSelectMonth(month)}
            variant="light"
          >
            {monthName}
          </Button>
        );
      })}
    </Stack>
  );
}

function TimeSheetView({
  user,
  year,
  month,
}: {
  user: NonNullable<ApiGetSimpleUsersResponse>[0];
  year: number;
  month: number;
}) {
  const fetcher = () =>
    axios
      .get<ApiGetUserTimesheetResponse>(`/api/users/${user.id}/timesheet`, {
        params: {
          year,
          month,
        },
      })
      .then((res) => res.data);

  const { data: timeSheetData, error } = useSWR(
    `/api/users/${user.id}/timesheet?year=${year}&month=${month}`,
    fetcher
  );

  if (error) return <div>Fehler beim Laden des Stundenzettels.</div>;
  if (!timeSheetData) return <div>Lade Stundenzettel…</div>;

  const totalHours = timeSheetData.timeSheet
    .flatMap((d) => d.shifts)
    .reduce((sum, s) => sum + s.hours, 0);

  const totalSupplements = timeSheetData.timeSheet.reduce(
    (sum, d) => sum + d.supplements,
    0
  );

  return (
    <div>
      {/* Controls (nicht drucken) */}
      <Group justify="flex-end" mb="md" className="print-hidden">
        <Button
          leftSection={<IconPrinter size={16} />}
          onClick={() => window.print()}
          variant="filled"
        >
          Drucken
        </Button>
      </Group>

      {/* PRINT AREA */}
      <div className="timesheet-print">
        {/* Print Header */}
        <Group justify="space-between" mb="md">
          <Text fw={600}>Monatsbericht</Text>
          <Text>
            {user.firstName} {user.lastName}
          </Text>
          <Text>
            {new Date(year, month, 1).toLocaleDateString('de-DE', {
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </Group>

        <table className="w-full border-collapse text-sm table-fixed">
          <thead>
            <tr>
              <th className="border p-1 text-center">Datum</th>
              <th className="border p-1 text-center">Tag</th>
              <th className="border p-1 text-center">Bezeichnung</th>
              <th className="border p-1 text-left">Uhrzeit Beginn</th>
              <th className="border p-1 text-left">Uhrzeit Ende</th>
              <th className="border p-1 text-right">Stunden</th>
              <th className="border p-1 text-right">Zuschläge</th>
            </tr>
          </thead>

          <TimeSheetTableBody
            data={timeSheetData.timeSheet}
            year={year}
            month={month}
          />

          <tr>
            <td className="border p-1 font-medium" colSpan={5}>
              Gesamt
            </td>
            <td className="border p-1 font-medium text-right">
              {fmtHours(totalHours)}
            </td>
            <td className="border p-1 font-medium text-right">
              {fmtEuro(totalSupplements)}
            </td>
          </tr>
        </table>

        <div className="flex flex-col gap-1 mt-6 max-w-xs ml-auto">
          <div className="flex justify-between">
            <div>Soll Stunden</div>
            <div>{fmtHours(timeSheetData.plannedMonthlyHours)}</div>
          </div>
          <div className="flex justify-between">
            <div>Ist Stunden</div>
            <div>{fmtHours(totalHours)}</div>
          </div>
          <div className="flex justify-between border-t border-slate-600 pt-1 font-medium">
            <div>Überstunden</div>
            <div>
              {fmtHours(totalHours - timeSheetData.plannedMonthlyHours)}
            </div>
          </div>
        </div>

        {/* Signatures (optional, aber meist sinnvoll) */}
        <div className="signature-grid">
          <div>
            <div style={{ height: '18mm' }} />
            <div className="signature-line">Unterschrift Mitarbeiter</div>
          </div>
          <div>
            <div style={{ height: '18mm' }} />
            <div className="signature-line">Unterschrift Arbeitgeber</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimeSheetTableBody({
  data,
  year,
  month, // 0–11
}: {
  data: ApiGetUserTimesheetResponse['timeSheet'];
  year: number;
  month: number;
}) {
  return (
    <tbody>
      {data.map((day) => {
        const shiftCount = Math.max(day.shifts.length, 1);

        const weekday = new Date(year, month, day.day).toLocaleDateString(
          'de-DE',
          {
            weekday: 'short',
          }
        );

        const dayLabel = day.day.toString() + '.';

        return (
          <Fragment key={`day-${day.day}`}>
            <tr>
              <td className="border p-1 text-center" rowSpan={shiftCount}>
                {dayLabel}
              </td>

              <td
                className="border p-1 capitalize text-center"
                rowSpan={shiftCount}
              >
                {weekday}
              </td>

              {day.shifts.length > 0 ? (
                <>
                  <td className="border p-1">{fmtCode(day.shifts[0].code)}</td>
                  <td className="border p-1">{fmtTime(day.shifts[0].start)}</td>
                  <td className="border p-1">{fmtTime(day.shifts[0].end)}</td>
                  <td className="border p-1 text-right">
                    {fmtHours(day.shifts[0].hours)}
                  </td>
                </>
              ) : (
                <>
                  <td className="border p-1"></td>
                  <td className="border p-1"></td>
                  <td className="border p-1"></td>
                  <td className="border p-1"></td>
                </>
              )}

              <td
                className="border p-1 text-right font-medium"
                rowSpan={shiftCount}
              >
                {day.supplements > 0 ? fmtEuro(day.supplements) : ''}
              </td>
            </tr>

            {day.shifts.slice(1).map((shift, i) => (
              <tr key={`day-${day.day}-shift-${i}`}>
                <td className="border p-1 text-right">{fmtCode(shift.code)}</td>
                <td className="border p-1">{fmtTime(shift.start)}</td>
                <td className="border p-1">{fmtTime(shift.end)}</td>
                <td className="border p-1 text-right">
                  {fmtHours(shift.hours)}
                </td>
              </tr>
            ))}
          </Fragment>
        );
      })}
    </tbody>
  );
}
