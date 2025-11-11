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

const monthKey = (y: number, m0: number) =>
  `${y}-${String(m0 + 1).padStart(2, '0')}`;

const startOfMonth = (y: number, m0: number) => new Date(y, m0, 1);
const startOfNextMonth = (y: number, m0: number) => new Date(y, m0 + 1, 1);

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

  const loadedMonthsRef = useRef<Set<string>>(new Set());
  // Load shifts for period
  useEffect(() => {
    const key = monthKey(startYear, startMonth);
    if (loadedMonthsRef.current.has(key)) return; // ✅ schon da, nichts laden

    const from = dateToISO(startOfMonth(startYear, startMonth));
    const to = dateToISO(startOfNextMonth(startYear, startMonth)); // [from, to)

    const controller = new AbortController();

    async function loadMonth() {
      const { data } = await axios.get<ApiGetShiftsPlannerResponse>(
        '/api/shifts/planner',
        { params: { from, to }, signal: controller.signal }
      );

      const monthData: Record<string, any[]> = {};
      for (const s of data) {
        const d = new Date(s.start);
        const k = `${
          s.userId
        }|${d.getFullYear()}|${d.getMonth()}|${d.getDate()}`;
        (monthData[k] ||= []).push({
          state: 'unchanged',
          id: s.id,
          code: s.code || undefined,
          isSick: s.isSick || false,
          clockIn: s.clockIn,
          clockOut: s.clockOut,
        });
      }

      setData((prev) => {
        const merged = { ...prev, ...monthData };
        baseDataRef.current = buildNormalizedFromData(merged);
        return merged;
      });

      loadedMonthsRef.current.add(key); // ✅ merken
    }

    loadMonth().catch((e) => {
      if (axios.isCancel(e)) return;
      console.error('load month failed', e);
    });

    return () => controller.abort();
  }, [startYear, startMonth, setData, baseDataRef]);

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
