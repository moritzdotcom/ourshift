import { pickContractForDate } from './digitalContract';
import { KpiGetHolidays, KpiGetShifts, KpiGetUsers } from './kpiCache';
import { Decimal } from '@prisma/client/runtime/library';
import ExcelJS from 'exceljs';

function dayISO(d: Date | string) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(x.getDate()).padStart(2, '0')}`;
}
function isHoliday(dateISO: string, holidays: { date: Date | string }[]) {
  return holidays.some((h) => dayISO(h.date) === dateISO);
}

function hourlyFromContract(
  c: {
    hourlyRateCents: number | null;
    salaryMonthlyCents: number | null;
    weeklyHours: Decimal | null;
  } | null
): number | null {
  if (!c) return null;
  if (c.hourlyRateCents != null) return c.hourlyRateCents;
  if (
    c.salaryMonthlyCents != null &&
    c.weeklyHours != null &&
    Number(c.weeklyHours) > 0
  ) {
    const hoursPerMonth = Number(c.weeklyHours) * (52 / 12); // ~4.333 Wochen
    return Math.round(c.salaryMonthlyCents / hoursPerMonth);
  }
  return null;
}
function splitShiftByDay(
  start: Date,
  end: Date
): { day: string; fromMin: number; toMin: number }[] {
  const parts: { day: string; fromMin: number; toMin: number }[] = [];
  let cur = start;
  while (cur < end) {
    const dayStart = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate());
    const nextDay = new Date(dayStart);
    nextDay.setDate(dayStart.getDate() + 1);
    const segStart = cur;
    const segEnd = end < nextDay ? end : nextDay;
    parts.push({
      day: dayISO(dayStart),
      fromMin: segStart.getHours() * 60 + segStart.getMinutes(),
      toMin: segEnd.getHours() * 60 + segEnd.getMinutes(),
    });
    cur = segEnd;
  }
  return parts;
}
function overlapMinutesWithWindow(
  fromMin: number,
  toMin: number,
  winStart: number | null,
  winEnd: number | null
): number {
  if (winStart == null || winEnd == null) return Math.max(0, toMin - fromMin); // ganztägig
  if (winEnd < winStart) {
    // über Mitternacht
    return (
      overlapMinutesWithWindow(fromMin, toMin, 0, winEnd) +
      overlapMinutesWithWindow(fromMin, toMin, winStart, 1440)
    );
  }
  const s = Math.max(fromMin, winStart);
  const e = Math.min(toMin, winEnd);
  return Math.max(0, e - s);
}

function ruleActiveOnDay(
  rule: {
    holidayOnly: boolean;
    excludeHolidays: boolean;
    daysOfWeek: number[];
    validFrom: Date | string;
    validUntil: Date | string | null;
  },
  day: string,
  holidays: KpiGetHolidays
) {
  const d = new Date(day + 'T00:00:00');
  const isHol = isHoliday(day, holidays);
  if (rule.holidayOnly && !isHol) return false;
  if (rule.excludeHolidays && isHol) return false;
  if (rule.daysOfWeek?.length) {
    const dow = d.getDay(); // 0..6
    if (!rule.daysOfWeek.includes(dow)) return false;
  }
  const from = new Date(rule.validFrom).getTime();
  const until = rule.validUntil
    ? new Date(rule.validUntil).getTime()
    : Number.MAX_SAFE_INTEGER;
  const t = d.getTime();
  return t >= from && t <= until;
}

function calculateBonus(
  monthIndex: number,
  contract: {
    salaryMonthlyCents: number | null;
    vacationBonus: number | null;
    christmasBonus: number | null;
  } | null
) {
  if (contract && contract.salaryMonthlyCents) {
    if (monthIndex === 5 && contract.vacationBonus) {
      return {
        name: 'Urlaubsgeld',
        amountCents:
          (contract.salaryMonthlyCents * contract.vacationBonus) / 100,
      };
    }
    if (monthIndex === 10 && contract.christmasBonus) {
      return {
        name: 'Weihnachtsgeld',
        amountCents:
          (contract.salaryMonthlyCents * contract.christmasBonus) / 100,
      };
    }
  }
}

export type PayrollRow = {
  userId: string;
  userName: string;
  monthMinutes: number;
  baseSalaryCents: number;
  baseHourlyCents: number | null;
  baseFromHoursCents: number; // falls Stundenlohn
  supplementsByRule: {
    ruleId: string;
    name: string;
    minutes: number;
    amountCents: number;
    percent: number;
  }[];
  supplementsTotalCents: number;
  grossCents: number;
  bonus:
    | {
        name: string;
        amountCents: number;
      }
    | undefined;
};

export function buildPayrollForMonth({
  year,
  monthIndex,
  users,
  shifts,
  holidays,
}: {
  year: number;
  monthIndex: number;
  users: KpiGetUsers;
  shifts: KpiGetShifts;
  holidays: KpiGetHolidays;
}): PayrollRow[] {
  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 1);

  // Shifts im Monat
  const shiftsInMonth = shifts.filter((s) => {
    const st = new Date(s.start),
      en = new Date(s.end);
    return en > monthStart && st < monthEnd;
  });

  const byUser: Record<string, KpiGetShifts> = {};
  for (const s of shiftsInMonth) {
    (byUser[s.userId] ||= []).push(s);
  }

  const rows: PayrollRow[] = [];

  for (const u of users.filter((x) => x.isActive)) {
    const userShifts = byUser[u.id] ?? [];
    let totalMinutes = 0;

    // Contract/Stundensatz (hier: an Monatsmitte ermitteln)
    const mid = new Date(year, monthIndex, 15);
    const contract = pickContractForDate(u.contracts ?? [], mid);
    const hourly = hourlyFromContract(contract);
    const fixedSalary = contract?.salaryMonthlyCents ?? 0;

    const suppMap = new Map<
      string,
      { name: string; minutes: number; amountCents: number; percent: number }
    >();

    for (const s of userShifts) {
      if (!s.clockIn || !s.clockOut || !s.code || !s.code.isWorkingShift)
        continue;
      const st = new Date(s.clockIn);
      const en = new Date(s.clockOut);
      totalMinutes += Math.round((en.getTime() - st.getTime()) / 60000);
      const parts = splitShiftByDay(st, en);

      for (const p of parts) {
        // nur aktive Regeln dieses Users am Tag
        const dayRules = (u.payRules || []).filter((r) =>
          ruleActiveOnDay(r, p.day, holidays)
        );
        for (const r of dayRules) {
          const ov = overlapMinutesWithWindow(
            p.fromMin,
            p.toMin === 0 ? 1440 : p.toMin,
            r.windowStartMin ?? null,
            r.windowEndMin === 0 ? 1440 : r.windowEndMin ?? null
          );
          if (ov <= 0) continue;
          if (hourly == null || r.percent == null) continue;

          const percent = Number(r.percent);
          const amount = Math.round((ov / 60) * hourly * (percent / 100));

          const item = suppMap.get(r.id) ?? {
            name: r.name,
            minutes: 0,
            amountCents: 0,
            percent,
          };
          item.minutes += ov;
          item.amountCents += amount;
          suppMap.set(r.id, item);
        }
      }
    }

    const bonus = calculateBonus(monthIndex, contract);

    const supplements = [...suppMap.entries()].map(([ruleId, v]) => ({
      ruleId,
      name: v.name,
      minutes: v.minutes,
      amountCents: v.amountCents,
      percent: v.percent,
    }));
    const supplementsTotal = supplements.reduce((a, b) => a + b.amountCents, 0);

    // Grundvergütung
    const baseFromHours =
      hourly != null && !fixedSalary
        ? Math.round((totalMinutes / 60) * hourly)
        : 0;
    const gross =
      (fixedSalary || 0) +
      baseFromHours +
      supplementsTotal +
      (bonus?.amountCents || 0);
    rows.push({
      userId: u.id,
      userName: `${u.firstName} ${u.lastName}`,
      monthMinutes: totalMinutes,
      baseSalaryCents: fixedSalary || 0,
      baseHourlyCents: hourly ?? null,
      baseFromHoursCents: baseFromHours,
      supplementsByRule: supplements,
      supplementsTotalCents: supplementsTotal,
      grossCents: gross,
      bonus,
    });
  }

  return rows;
}

export function downloadCSV(filename: string, rows: PayrollRow[]) {
  const bonusName = rows.find((r) => r.bonus)?.bonus?.name;
  const header = [
    'Mitarbeiter',
    'Gesamtstunden',
    'Grundgehalt (Monat)',
    'Grundvergütung (Std * Satz)',
    'Zuschläge (Summe)',
    `${bonusName || 'Sonstige Bonuszahlungen'} (Summe)`,
    'Brutto gesamt',
  ];
  const lines = [header.join(';')];

  for (const r of rows) {
    lines.push(
      [
        r.userName,
        (r.monthMinutes / 60).toFixed(2).replace('.', ','),
        (r.baseSalaryCents / 100).toFixed(2).replace('.', ','),
        (r.baseFromHoursCents / 100).toFixed(2).replace('.', ','),
        (r.supplementsTotalCents / 100).toFixed(2).replace('.', ','),
        ((r.bonus?.amountCents || 0) / 100).toFixed(2).replace('.', ','),
        (r.grossCents / 100).toFixed(2).replace('.', ','),
      ].join(';')
    );
  }

  const blob = new Blob([lines.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function centsToEuro(n: number | undefined | null) {
  if (!n) return 0;
  return n / 100;
}

function euroFmt(cell: ExcelJS.Cell) {
  cell.numFmt = '#,##0.00 [$€-407]';
}

function setHeader(ws: ExcelJS.Worksheet) {
  ws.columns = [
    { header: '', key: 'colA', width: 34 }, // Bezeichnung
    { header: '', key: 'colB', width: 16 }, // Grundlohn/Stunde (€/h)
    { header: '', key: 'colC', width: 12 }, // Minuten
    { header: '', key: 'colD', width: 10 }, // Faktor
    { header: '', key: 'colE', width: 16 }, // Zuschlag/€ Summen
  ];
}

function addEmployeeBlock(
  ws: ExcelJS.Worksheet,
  startRow: number,
  row: PayrollRow,
  isLast: boolean
) {
  let r = startRow;

  // Kopfzeile Mitarbeiter
  ws.getCell(r, 1).value = row.userName;
  ws.getCell(r, 2).value = 'Grundlohn/Stunde';
  ws.getCell(r, 3).value = 'Minuten';
  ws.getCell(r, 4).value = 'Faktor';
  ws.getCell(r, 5).value = 'Zuschlag';
  [1, 2, 3, 4, 5].forEach((c) => {
    ws.getCell(r, c).font = { bold: true };
    ws.getCell(r, c).border = {
      bottom: { style: 'thin', color: { argb: '00000000' } },
    };
  });
  r++;

  for (const supp of row.supplementsByRule.sort((a, b) =>
    a.name.localeCompare(b.name)
  )) {
    ws.getCell(r, 1).value = supp.name;
    ws.getCell(r, 2).value = centsToEuro(row.baseHourlyCents);
    euroFmt(ws.getCell(r, 2));
    ws.getCell(r, 3).value = supp.minutes;
    ws.getCell(r, 3).numFmt = '#,##';
    ws.getCell(r, 4).value = supp.percent / 100;
    ws.getCell(r, 4).numFmt = '0%';
    ws.getCell(r, 5).value = centsToEuro(supp.amountCents);
    euroFmt(ws.getCell(r, 5));
    r++;
  }

  for (let c = 1; c <= 5; c++) {
    ws.getCell(r - 1, c).border = {
      bottom: { style: 'thin', color: { argb: '00000000' } },
    };
  }

  // Gesamt Zuschlag
  ws.getCell(r, 1).value = 'Gesamt Zuschlag';
  ws.getCell(r, 1).font = { bold: true };
  ws.getCell(r, 5).value = centsToEuro(row.supplementsTotalCents);
  euroFmt(ws.getCell(r, 5));
  r += 2;

  // leichte Abgrenzung zum nächsten Block
  if (isLast) return r;
  for (let c = 1; c <= 5; c++) {
    ws.getCell(r, c).border = {
      bottom: { style: 'thin', color: { argb: '00000000' } },
    };
  }
  r += 2;

  return r; // next start row
}

export async function downloadPayrollXLSX(
  filename: string,
  rows: PayrollRow[],
  month: string
) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Lohnabrechnung');

  setHeader(ws);

  let r = 2;
  // Optional: Monatskopf
  ws.getCell(r, 5).value = month;
  ws.getCell(r, 1).font = { bold: true };
  r += 2;

  const employeesWithRules = rows.filter((r) => r.supplementsByRule.length > 0);

  employeesWithRules.forEach((emp, i) => {
    r = addEmployeeBlock(ws, r, emp, i === employeesWithRules.length - 1);
  });

  // Optik: Standardfont & Zeilenhöhe etwas luftiger
  ws.eachRow((row) => {
    row.eachCell((cell) => {
      cell.font = cell.font ?? {};
      cell.alignment = { vertical: 'middle' };
    });
  });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
