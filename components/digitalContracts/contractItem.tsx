import { DigitalContract } from '@/generated/prisma';
import { dateToHuman } from '@/lib/dates';

export default function ContractItem({
  contract,
}: {
  contract: DigitalContract;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <KV
        label="Gültigkeit"
        value={`${dateToHuman(contract.validFrom)} - ${
          dateToHuman(contract.validUntil) || 'offen'
        }`}
      />
      <KV
        label="Monatl. Grundgehalt"
        value={fmtEuro(contract.salaryMonthlyCents)}
      />
      <KV label="Stundensatz" value={fmtEuro(contract.hourlyRateCents)} />
      <KV label="Urlaubstage/Jahr" value={contract.vacationDaysAnnual ?? '—'} />
      <KV
        label="Stunden/Woche"
        value={contract.weeklyHours ? Number(contract.weeklyHours) : '—'}
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
  if (cents == null) return '—';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}
