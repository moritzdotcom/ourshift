function dayISO(d: Date | string) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(x.getDate()).padStart(2, '0')}`;
}

export function isHoliday(
  dateISO: string,
  holidays: { date: Date | string }[]
) {
  return holidays.some((h) => dayISO(h.date) === dateISO);
}
