import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Router from 'next/router';
import ManagementLayout from '@/layouts/managementLayout';
import { useDisclosure } from '@mantine/hooks';

import { Holiday, ShiftCode } from '@/generated/prisma';
import { ApiGetSimpleUsersResponse } from '../api/users';
import { dateToISO, mergeDateAndMinutes } from '@/lib/dates';
import { showInfo, showSuccess } from '@/lib/toast';
import { buildNormalizedFromData } from '@/lib/planner';

import PlannerToolbar from '@/components/planner/toolbar';
import PlannerLegend from '@/components/planner/legend';
import PlannerSaveModal from '@/components/planner/saveModal';
import PlannerGridMonth from '@/components/planner/grid';
import PlannerBottomBar from '@/components/planner/bottomBar';

import { usePlanData } from '@/hooks/usePlanData';
import { useUnsavedGuard } from '@/hooks/useUnsavedGuard';
import { ApiGetShiftsPlannerResponse } from '../api/shifts/planner';

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
    activeCode,
    setActiveCode,
    isPainting,
    setIsPainting,
    readCell,
    tryWriteCell,
    isPastDate,
    warnPastOnce,
    baseDataRef,
    resetBaseFromCurrent,
  } = usePlanData(shiftCodes, true);

  const [confirmLeaveOpen, { open: openConfirm, close: closeConfirm }] =
    useDisclosure(false);
  const { unsaved, nextUrlRef, calcDiff } = useUnsavedGuard(
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

  // Load shifts for period
  useEffect(() => {
    async function loadShifts() {
      const from = dateToISO(new Date(startYear, startMonth, 1));
      const { data } = await axios.get<ApiGetShiftsPlannerResponse>(
        '/api/shifts/planner',
        {
          params: { from },
        }
      );
      const initialData: Record<string, any> = {};
      for (const s of data) {
        const d = new Date(s.start);
        const k = `${
          s.userId
        }|${d.getFullYear()}|${d.getMonth()}|${d.getDate()}`;
        initialData[k] = {
          state: 'unchanged',
          id: s.id,
          code: s.code || undefined,
          isSick: s.isSick || false,
        };
      }
      setData((prev) => {
        const merged = { ...(initialData as any), ...(prev as any) };
        baseDataRef.current = buildNormalizedFromData(merged);
        return { ...initialData, ...prev };
      });
    }
    loadShifts();
  }, [startMonth, startYear, setData, baseDataRef]);

  // Save
  async function handleSave() {
    const toSave: any[] = [];

    for (const [k, v] of Object.entries(data).filter(
      ([_, v]) => v.state !== 'unchanged'
    )) {
      const [userId, y, m, d] = k.split('|');
      const yy = parseInt(y, 10);
      const mm = parseInt(m, 10);
      const dd = parseInt(d, 10);

      if (isPastDate(yy, mm, dd)) continue;

      const date = new Date(yy, mm, dd);

      let startMin = null;
      let endMin = null;
      let codeId = null;

      if (v.code !== 'U') {
        startMin = v.code?.windowStartMin ?? null;
        endMin = v.code?.windowEndMin ?? null;
        codeId = v.code?.id ?? null;
      }

      const isAllDay = startMin === null && endMin === null;

      const startIso = isAllDay
        ? mergeDateAndMinutes(date, 0) // 00:00 lokaler Tag → UTC
        : mergeDateAndMinutes(date, startMin);

      const endIso = isAllDay
        ? // EXKLUSIVES Ende: nächster Tag 00:00, DST-sicher per Date-Komponenten
          mergeDateAndMinutes(new Date(yy, mm, dd + 1), 0)
        : mergeDateAndMinutes(date, endMin);

      toSave.push({
        userId,
        start: startIso,
        end: endIso,
        codeId,
        existingId: v.id,
        state: v.state,
        isSick: v.isSick || false,
        vacation: v.code === 'U',
      });
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
          <PlannerToolbar
            shiftCodes={shiftCodes}
            activeCode={activeCode}
            setActiveCode={setActiveCode}
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
                  employees={employees}
                  holidays={holidays}
                  readCell={readCell}
                  tryWriteCell={tryWriteCell}
                  isPastDate={isPastDate}
                  activeCode={activeCode}
                  setIsPainting={setIsPainting}
                  isPainting={isPainting}
                />
              );
            })}
          </div>

          <PlannerBottomBar unsavedCount={unsaved.length} onSave={handleSave} />
        </div>
      </div>

      <PlannerSaveModal
        opened={confirmLeaveOpen}
        unsaved={unsaved}
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
