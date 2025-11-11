import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import Router from 'next/router';
import ManagementLayout from '@/layouts/managementLayout';
import { useDisclosure } from '@mantine/hooks';

import { Holiday, ShiftCode } from '@/generated/prisma';
import { ApiGetSimpleUsersResponse } from '../../api/users';
import { dateToISO, mergeDateAndMinutes } from '@/lib/dates';
import { showInfo, showSuccess } from '@/lib/toast';
import { buildNormalizedFromData } from '@/lib/planner';

import PlannerToolbar from '@/components/planner/toolbar';
import PlannerLegend from '@/components/planner/legend';
import PlannerSaveModal from '@/components/planner/saveModal';
import PlannerGridMonth from '@/components/planner/grid';
import PlannerTimeSelection from '@/components/planner/timeSelection';

import { usePlanData } from '@/hooks/usePlanData';
import { useUnsavedGuard } from '@/hooks/useUnsavedGuard';
import { ApiGetShiftsPlannerResponse } from '../../api/shifts/planner';
import { employedInMonth } from '@/lib/user';

const startOfMonth = (y: number, m0: number) => new Date(y, m0, 1);
const addMonths = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth() + n, 1);

type Range = { from: Date; to: Date }; // [from, to) (to = 1. des Folgemonats)

// Ermittelt fehlende Segmente relativ zu 'loaded'.
// Rückgabe: 0..2 Segmente, die nachgeladen werden sollten.
function diffMissingSegments(loaded: Range | null, desired: Range): Range[] {
  if (!loaded) return [desired];

  const segs: Range[] = [];

  // linkes fehlendes Stück
  if (desired.from < loaded.from) {
    segs.push({
      from: desired.from,
      to: new Date(Math.min(loaded.from.getTime(), desired.to.getTime())),
    });
  }
  // rechtes fehlendes Stück
  if (desired.to > loaded.to) {
    segs.push({
      from: new Date(Math.max(loaded.to.getTime(), desired.from.getTime())),
      to: desired.to,
    });
  }
  return segs;
}

export default function PlanPage() {
  const today = new Date();
  const [startMonth, setStartMonth] = useState<number>(today.getMonth());
  const [startYear, setStartYear] = useState<number>(today.getFullYear());
  const [numMonths, setNumMonths] = useState<number>(12);

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [shiftCodes, setShiftCodes] = useState<ShiftCode[]>([]);
  const [employees, setEmployees] = useState<ApiGetSimpleUsersResponse>([]);

  // Data hook
  const {
    data,
    setData,
    mode,
    setMode,
    activeCode,
    setActiveCode,
    isPainting,
    setIsPainting,
    readCell,
    tryWriteCell,
    isPastDate,
    baseDataRef,
    resetBaseFromCurrent,
  } = usePlanData(shiftCodes, true);

  const [confirmLeaveOpen, { open: openConfirm, close: closeConfirm }] =
    useDisclosure(false);
  const { unsaved, unsavedCount, nextUrlRef, calcDiff } = useUnsavedGuard(
    data,
    baseDataRef,
    openConfirm
  );

  function monthOffset(baseY: number, baseM: number, offset: number) {
    const d = new Date(baseY, baseM + offset, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  }

  // Loader
  useEffect(() => {
    async function loadAll() {
      const [{ data: hs }, { data: sc }, { data: emps }] = await Promise.all([
        axios.get<Holiday[]>('/api/holidays'),
        axios.get<ShiftCode[]>('/api/shiftCodes'),
        axios.get<ApiGetSimpleUsersResponse>('/api/users?simple=true'),
      ]);
      setHolidays(hs);
      setShiftCodes(sc);
      setEmployees(emps.filter((u) => u.isActive));
    }
    loadAll();
  }, []);

  const loadedRangeRef = useRef<{ from: Date; to: Date } | null>(null);
  // Load shifts for period
  useEffect(() => {
    const desired: Range = {
      from: startOfMonth(startYear, startMonth),
      to: addMonths(startOfMonth(startYear, startMonth), numMonths),
    };

    const missing = diffMissingSegments(loadedRangeRef.current, desired);
    if (missing.length === 0) return;

    // Du kannst entweder beide Segmente nacheinander laden (wenn 2)
    // oder sie zu einem großen Intervall zusammenfassen (lädt Mittelteil erneut).
    (async () => {
      for (const seg of missing) {
        const { data } = await axios.get<ApiGetShiftsPlannerResponse>(
          '/api/shifts/planner',
          { params: { from: dateToISO(seg.from), to: dateToISO(seg.to) } }
        );

        // ...normalisieren & mergen wie bisher...
        const chunk: Record<string, any[]> = {};
        for (const s of data) {
          const d = new Date(s.start);
          const k = `${
            s.userId
          }|${d.getFullYear()}|${d.getMonth()}|${d.getDate()}`;
          (chunk[k] ||= []).push({
            state: 'unchanged',
            id: s.id,
            code: s.code || undefined,
            isSick: s.isSick || false,
            clockIn: s.clockIn,
            clockOut: s.clockOut,
          });
        }
        setData((prev) => {
          const merged = { ...prev, ...chunk };
          baseDataRef.current = buildNormalizedFromData(merged);
          return merged;
        });

        // loadedRange erweitern
        if (!loadedRangeRef.current) {
          loadedRangeRef.current = { ...seg };
        } else {
          loadedRangeRef.current = {
            from: new Date(
              Math.min(
                loadedRangeRef.current.from.getTime(),
                seg.from.getTime()
              )
            ),
            to: new Date(
              Math.max(loadedRangeRef.current.to.getTime(), seg.to.getTime())
            ),
          };
        }
      }
    })();
  }, [startYear, startMonth, numMonths, setData, baseDataRef]);

  // Save
  async function handleSave() {
    const toSave: any[] = [];

    for (const [k, v] of Object.entries(data)) {
      const [userId, y, m, d] = k.split('|');
      const yy = parseInt(y, 10);
      const mm = parseInt(m, 10);
      const dd = parseInt(d, 10);

      if (isPastDate(yy, mm, dd)) continue;

      const date = new Date(yy, mm, dd);

      for (const so of v) {
        if (so.state == 'unchanged') continue;

        let startMin = null;
        let endMin = null;
        let codeId = null;

        if (so.code !== 'U') {
          startMin = so.code?.windowStartMin ?? null;
          endMin = so.code?.windowEndMin ?? null;
          codeId = so.code?.id ?? null;
        }

        const isAllDay = startMin === null && endMin === null;

        const startIso = isAllDay
          ? mergeDateAndMinutes(date, 0) // 00:00 lokaler Tag → UTC
          : mergeDateAndMinutes(date, startMin);

        const endDate =
          isAllDay || (endMin && startMin && endMin < startMin)
            ? new Date(yy, mm, dd + 1)
            : date;
        const endIso = isAllDay
          ? // EXKLUSIVES Ende: nächster Tag 00:00, DST-sicher per Date-Komponenten
            mergeDateAndMinutes(endDate, 0)
          : mergeDateAndMinutes(endDate, endMin);

        toSave.push({
          userId,
          start: startIso,
          end: endIso,
          codeId,
          existingId: so.id,
          state: so.state,
          isSick: so.isSick || false,
          vacation: so.code === 'U',
        });
      }
    }

    if (!toSave.length) return showInfo('Keine Änderungen zum Speichern.');

    await axios.post('/api/shifts/bulk', toSave);
    resetBaseFromCurrent();
    calcDiff?.(); // falls du das brauchst
    showSuccess('Änderungen gespeichert!');
    closeConfirm();
    if (nextUrlRef.current) Router.push(nextUrlRef.current);
  }

  function codeLabel(id: string) {
    if (!id) return '—';
    const c = shiftCodes.find((x) => x.id === id);
    return c ? `${c.code}` : id;
  }
  function employeeName(id: string) {
    if (!id) return '—';
    const e = employees.find((x) => x.id === id);
    return e ? `${e.firstName} ${e.lastName}` : id;
  }

  return (
    <ManagementLayout>
      <div className="min-h-screen w-full py-6 px-3">
        <div className="mx-auto space-y-4">
          <PlannerTimeSelection
            startYear={startYear}
            startMonth={startMonth}
            numMonths={numMonths}
            setStartYear={setStartYear}
            setStartMonth={setStartMonth}
            setNumMonths={setNumMonths}
          />

          <PlannerLegend shiftCodes={shiftCodes} />

          {/* Months */}
          <div className="space-y-10 select-none">
            {Array.from({ length: numMonths }).map((_, idx) => {
              const { year, month } = monthOffset(startYear, startMonth, idx);
              return (
                <PlannerGridMonth
                  key={`${year}-${month}`}
                  year={year}
                  month={month}
                  employees={employees.filter((e) =>
                    employedInMonth(e, year, month)
                  )}
                  holidays={holidays}
                  readCell={readCell}
                  tryWriteCell={tryWriteCell}
                  isPastDate={isPastDate}
                  activeCode={activeCode}
                  setIsPainting={setIsPainting}
                  isPainting={isPainting}
                  mode={mode}
                />
              );
            })}
          </div>
        </div>
      </div>

      <PlannerToolbar
        shiftCodes={shiftCodes}
        activeCode={activeCode}
        setActiveCode={setActiveCode}
        unsavedCount={unsavedCount}
        onSave={handleSave}
        mode={mode}
        setMode={setMode}
      />

      <PlannerSaveModal
        opened={confirmLeaveOpen}
        unsaved={unsaved}
        unsavedCount={unsavedCount}
        codeLabel={codeLabel}
        employeeName={employeeName}
        onCancel={() => {
          baseDataRef.current = buildNormalizedFromData(data);
          closeConfirm();
          if (nextUrlRef.current) Router.push(nextUrlRef.current);
        }}
        onSave={handleSave}
      />
    </ManagementLayout>
  );
}
