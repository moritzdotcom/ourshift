import { MonthClosingShift } from '@/pages/management/monthClosing';
import { useMemo } from 'react';

function ms(d1: Date, d2: Date) {
  return d2.getTime() - d1.getTime();
}
function minutes(d1: Date | string, d2: Date | string) {
  return Math.max(0, Math.round(ms(new Date(d1), new Date(d2)) / 60000));
}
function sameDay(a: Date | string, b: Date | string) {
  const ad = new Date(a);
  const bd = new Date(b);
  return (
    ad.getFullYear() === bd.getFullYear() &&
    ad.getMonth() === bd.getMonth() &&
    ad.getDate() === bd.getDate()
  );
}

export function useMonthClosingStats(shifts: MonthClosingShift[]) {
  return useMemo(() => {
    const total = shifts.length;

    const stamped = shifts.reduce(
      (acc, s) => acc + ((s.clockIn && s.clockOut) || s.shiftAbsence ? 1 : 0),
      0
    );

    const toReview = Math.max(0, total - stamped);
    const percentageDone = total ? Math.round((stamped / total) * 100) : 0;

    const needsManualFix = shifts.filter(
      (s) => !s.shiftAbsence && (!s.clockIn || !s.clockOut)
    );

    const shortDur: MonthClosingShift[] = [];
    const longDur: MonthClosingShift[] = [];
    const overnight: MonthClosingShift[] = [];
    const sickDays = shifts.filter(
      (s) => s.shiftAbsence?.reason === 'SICKNESS'
    ).length;

    // Abweichung zu Sollfenster (wenn Code-Fenster gepflegt)
    const lateClockIn: MonthClosingShift[] = [];
    const earlyClockOut: MonthClosingShift[] = [];
    for (const s of shifts) {
      if (!s.code) continue;
      if (s.clockIn) {
        const schedStart = new Date(s.start);
        if (new Date(s.clockIn).getTime() > schedStart.getTime())
          lateClockIn.push(s);
      }
      if (s.clockOut) {
        const schedEnd = new Date(s.end);
        if (new Date(s.clockOut).getTime() < schedEnd.getTime())
          earlyClockOut.push(s);
      }
    }

    return {
      total,
      stamped,
      toReview,
      percentageDone,
      needsManualFix,
      shortDur,
      longDur,
      overnight,
      lateClockIn,
      earlyClockOut,
      sickDays,
    };
  }, [shifts]);
}
