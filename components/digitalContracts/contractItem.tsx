import { DigitalContract } from '@/generated/prisma';
import { dateToHuman } from '@/lib/dates';

export default function ContractItem({
  contract,
}: {
  contract: DigitalContract;
}) {
  const {
    validFrom,
    validUntil,
    vacationDaysAnnual,
    weeklyHours,
    salaryMonthlyCents,
    hourlyRateCents,
    vacationBonus,
    christmasBonus,
  } = contract;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <KV
        label="Gültigkeit"
        value={`${dateToHuman(validFrom)} - ${
          dateToHuman(validUntil) || 'offen'
        }`}
      />
      <KV label="Urlaubstage/Jahr" value={vacationDaysAnnual ?? '-'} />
      <KV
        label="Stunden/Woche"
        value={weeklyHours ? Number(weeklyHours) : '-'}
      />
      <KV label="Monatl. Grundgehalt" value={fmtEuro(salaryMonthlyCents)} />
      <KV
        label="Stundensatz"
        value={fmtEuro(hourlyRateCents)}
        className="md:col-span-2"
      />
      <KV
        label="Urlaubsgeld (Jun)"
        value={fmtBonus(salaryMonthlyCents, vacationBonus)}
      />
      <KV
        label="Weihnachtsgeld (Nov)"
        value={fmtBonus(salaryMonthlyCents, christmasBonus)}
      />
    </div>
  );
}

function KV({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function fmtEuro(cents?: number | null) {
  if (cents == null) return '-';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

function fmtBonus(cents: number | null, bonus: number | null) {
  if (cents == null || bonus == null) return '-';
  return `${fmtEuro((cents * bonus) / 100)} (${bonus}%)`;
}
