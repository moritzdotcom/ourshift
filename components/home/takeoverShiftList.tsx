import { timeToHuman } from '@/lib/dates';
import { showError, showSuccess } from '@/lib/toast';
import { MyShift } from '@/pages';
import { TakeoverShift } from '@/pages/api/shifts/takeover';
import { Button, Card, Group, Text } from '@mantine/core';
import axios from 'axios';
import ShiftCodeBadge from '../shiftCodes/badge';
import useSWR from 'swr';

function fmtDate(s: string | Date) {
  const d = typeof s === 'string' ? new Date(s) : s;
  return d.toLocaleDateString('de', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

export default function TakeoverShiftList({
  onTakeover,
}: {
  onTakeover: (takeover: MyShift) => void;
}) {
  const fetcher = () =>
    axios.get<TakeoverShift[]>('/api/shifts/takeover').then((res) => res.data);

  const { data: takeoverShifts, mutate } = useSWR<TakeoverShift[]>(
    '/api/shifts/takeover',
    fetcher,
    {
      refreshInterval: 10 * 60_000,
    }
  );

  async function handleTakeover(takeover: TakeoverShift) {
    try {
      const { data } = await axios.put<MyShift>('/api/shifts/takeover', {
        shiftId: takeover.id,
      });
      mutate((shifts) => shifts?.filter((s) => s.id !== takeover.id));
      showSuccess(`Schicht von ${takeover.user.firstName} übernommen`);
      onTakeover(data);
    } catch (error) {
      showError('Schicht konnte nicht übernommen werden');
    }
  }

  if (!takeoverShifts || takeoverShifts.length == 0) return null;

  return (
    <Card withBorder radius="lg" p="lg" className="bg-white">
      <Text fw={500}>Aktuelle Schichten</Text>
      <Text c="dimmed" size="sm" mb={9}>
        Du hast im Moment keine Schicht. Du kannst für andere einspringen
      </Text>
      <div className="w-full flex flex-col gap-3">
        {takeoverShifts.map((s) => {
          return <TakeoverShiftRow s={s} handleTakeover={handleTakeover} />;
        })}
      </div>
    </Card>
  );
}

function TakeoverShiftRow({
  s,
  handleTakeover,
}: {
  s: TakeoverShift;
  handleTakeover: (s: TakeoverShift) => void;
}) {
  const start = new Date(s.start);
  const end = new Date(s.end);

  const isAllDay = start.getHours() == 0 && +end - +start == 86400000;

  return (
    <Card
      withBorder
      radius="md"
      p="sm"
      className="hover:bg-gray-50 transition-colors"
    >
      <Group justify="space-between" align="start" wrap="nowrap">
        <div>
          <div className="font-medium truncate">{fmtDate(s.start)}</div>
          <div className="flex flex-col md:flex-row md:gap-2">
            <div className="font-light truncate">
              {isAllDay ? '' : `${timeToHuman(s.start)}-${timeToHuman(s.end)}`}
            </div>
            <div>
              {s.code && (
                <ShiftCodeBadge code={s.code}>{s.code.label}</ShiftCodeBadge>
              )}
            </div>
          </div>
        </div>
        <div className="min-w-0 flex flex-col gap-1 items-end">
          <div className="font-medium truncate">Schicht von:</div>
          <div className="bg-slate-200 rounded-full flex items-center gap-2 px-1 py-1">
            <div className="bg-slate-50 rounded-full w-7 h-7 flex items-center justify-center">
              {s.user.firstName[0]}
            </div>
            <p className="text-sm pr-2">{s.user.firstName}</p>
          </div>
        </div>
      </Group>
      <div className="mt-2 w-full max-w-xl mx-auto">
        <Button
          size="xs"
          variant="subtle"
          color="violet"
          onClick={() => handleTakeover(s)}
          fullWidth
        >
          Schicht übernehmen
        </Button>
      </div>
    </Card>
  );
}
