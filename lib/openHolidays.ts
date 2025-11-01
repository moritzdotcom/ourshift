import { dateToISO } from './dates';

type OpenHolidayResponse = {
  id: string;
  startDate: string; // "2025-01-01"
  endDate: string; // "2025-01-01"
  type: string; // "Public"
  name: { language: string; text: string }[];
  regionalScope: string; // "Regional"
  temporalScope: string; // "FullDay"
  nationwide: boolean;
};

export async function fetchPublicHolidays(options: {
  from?: Date | string;
  to?: Date | string;
}) {
  const from = options?.from ? new Date(options.from) : new Date();
  const to = options?.to
    ? new Date(options.to)
    : new Date(from.getFullYear(), 11, 31);
  const fromParam = dateToISO(typeof from === 'string' ? new Date(from) : from);
  const toParam = dateToISO(typeof to === 'string' ? new Date(to) : to);

  const data = await fetch(
    `https://openholidaysapi.org/PublicHolidays?countryIsoCode=DE&validFrom=${fromParam}&validTo=${toParam}&languageIsoCode=DE&subdivisionCode=DE-NW`
  );
  if (!data.ok) {
    throw new Error('Failed to fetch public holidays');
  }
  const rawData: OpenHolidayResponse[] = await data.json();

  return rawData.map((h) => ({
    date: h.startDate,
    name:
      h.name.find((n) => n.language.toLowerCase() === 'de')?.text ||
      h.name[0].text,
  }));
}
