export function startOfMonth(y: number, m: number) {
  return new Date(y, m, 1, 0, 0, 0, 0);
}
export function endOfMonthExclusive(y: number, m: number) {
  return new Date(y, m + 1, 1, 0, 0, 0, 0);
}
export function isSameDay(a: Date, b: Date) {
  const da = a.toLocaleDateString();
  const db = b.toLocaleDateString();
  return da === db;
}
export function weekdayIndexMon0(date: Date) {
  // Montag = 0 ... Sonntag = 6
  const js = date.getDay(); // So=0..Sa=6
  return (js + 6) % 7;
}
export function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}
