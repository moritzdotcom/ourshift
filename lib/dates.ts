export function minToHHMM(min?: number | null) {
  if (min == null) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function hhmmToMin(v?: string | null) {
  if (!v) return null;
  const [h, m] = v.split(':').map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export function dateToHuman(d: string | Date | null | undefined) {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function dateToISO(d: string | Date | null | undefined) {
  if (!d) return '';
  const date = new Date(d);
  return date.toISOString().split('T')[0];
}

export function getYearOfDate(d: string | Date) {
  const date = new Date(d);
  return date.getFullYear();
}

export const WEEKDAY_OPTIONS = [
  { value: '1', label: 'Mo' },
  { value: '2', label: 'Di' },
  { value: '3', label: 'Mi' },
  { value: '4', label: 'Do' },
  { value: '5', label: 'Fr' },
  { value: '6', label: 'Sa' },
  { value: '0', label: 'So' },
];

export function WEEKDAY_LABEL(i: number) {
  return ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][i];
}

export function dateSortAsc(a: string | Date, b: string | Date) {
  return new Date(a).getTime() - new Date(b).getTime();
}

export function dateSortDesc(a: string | Date, b: string | Date) {
  return new Date(b).getTime() - new Date(a).getTime();
}

export function mergeDateAndMinutes(
  date: Date | string,
  minutes: number | null
): string {
  const d = new Date(date);
  // Datum auslesen (lokales Datum, aber nur Tag/Monat/Jahr wichtig)
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-based
  const day = d.getDate();

  // Wenn keine Minuten, dann Mitternacht UTC (des lokalen Datums)
  const totalMin = minutes ?? 0;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;

  // Konvertiere lokale Zeit in UTC (indem du Zeitzonenoffset abziehst)
  const local = new Date(year, month, day, hours, mins, 0);
  const utcMs = local.getTime() - local.getTimezoneOffset() * 60_000;
  return new Date(utcMs).toISOString();
}
