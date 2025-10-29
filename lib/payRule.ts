export type PayRulePreset = {
  id: string;
  name: string;
  windowStartMin: number | null;
  windowEndMin: number | null;
  daysOfWeek: number[];
  holidayOnly: boolean;
  excludeHolidays: boolean;
  percent: number;
};

export const PAY_RULE_PRESETS: Array<PayRulePreset> = [
  {
    id: 'pre-1',
    name: 'Feiertagszuschlag',
    windowStartMin: null,
    windowEndMin: null,
    daysOfWeek: [],
    holidayOnly: true,
    excludeHolidays: false,
    percent: 125,
  },
  {
    id: 'pre-2',
    name: 'Nacht-Zuschlag 20:00-0:00',
    windowStartMin: 1200,
    windowEndMin: 0,
    daysOfWeek: [],
    holidayOnly: false,
    excludeHolidays: true,
    percent: 25,
  },
  {
    id: 'pre-3',
    name: 'Nacht-Zuschlag 0:00-04:00',
    windowStartMin: 0,
    windowEndMin: 240,
    daysOfWeek: [],
    holidayOnly: false,
    excludeHolidays: true,
    percent: 40,
  },
  {
    id: 'pre-4',
    name: 'Nacht-Zuschlag 04:00-06:00',
    windowStartMin: 240,
    windowEndMin: 360,
    daysOfWeek: [],
    holidayOnly: false,
    excludeHolidays: true,
    percent: 25,
  },
  {
    id: 'pre-5',
    name: 'Sonntags-Zuschlag',
    windowStartMin: 1200,
    windowEndMin: 0,
    daysOfWeek: [0],
    holidayOnly: false,
    excludeHolidays: true,
    percent: 50,
  },
];
