import { pickContractForDate } from './digitalContract';
import { KpiGetHolidays, KpiGetShifts, KpiGetUsers } from './kpiCache';
import { Decimal } from '@prisma/client/runtime/library';
import ExcelJS from 'exceljs';
import {
  dayBoundsUtc,
  overlapMinutesUtc,
  toBerlin,
  windowsForDayUtc,
} from './time';

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

function splitShiftByDay(startUtc: Date, endUtc: Date) {
  const parts: { day: string; segStart: Date; segEnd: Date }[] = [];
  // in Berlin "laufen", aber Segmente als UTC-JS-Dates zurückgeben
  let curWall = toBerlin(startUtc);
  const endWall = toBerlin(endUtc);

  while (curWall < endWall) {
    const dayISO = curWall.toISODate()!;
    const { startUtc: dayStartUtc, endUtc: dayEndUtc } = dayBoundsUtc(dayISO);
    const segStart = new Date(
      Math.max(startUtc.getTime(), dayStartUtc.getTime())
    );
    const segEnd = new Date(Math.min(endUtc.getTime(), dayEndUtc.getTime()));
    parts.push({ day: dayISO, segStart, segEnd });
    curWall = curWall.plus({ days: 1 }).startOf('day');
  }
  return parts;
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
    triggers: { day: string; from: string; to: string; minutes: number }[];
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
      {
        name: string;
        minutes: number;
        amountCents: number;
        percent: number;
        triggers: { day: string; from: string; to: string; minutes: number }[];
      }
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
          const wins = windowsForDayUtc(
            p.day,
            r.windowStartMin ?? null,
            r.windowEndMin ?? null
          );
          let ov = 0;
          for (const [wStart, wEnd] of wins) {
            ov += overlapMinutesUtc(p.segStart, p.segEnd, wStart, wEnd);
          }
          if (ov <= 0) continue;
          if (hourly == null || r.percent == null) continue;

          const percent = Number(r.percent);
          const amount = Math.round((ov / 60) * hourly * (percent / 100));

          const item = suppMap.get(r.id) ?? {
            name: r.name,
            minutes: 0,
            amountCents: 0,
            percent,
            triggers: [],
          };
          item.minutes += ov;
          item.amountCents += amount;
          item.triggers.push({
            day: p.day,
            from: p.segStart.toISOString(),
            to: p.segEnd.toISOString(),
            minutes: ov,
          });
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
      triggers: v.triggers,
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
