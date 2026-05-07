interface SeverityBadgeProps {
  severity: string;
}

export default function SeverityBadge({ severity }: SeverityBadgeProps) {
  const colors = {
    CRITICAL: 'border-red-400/40 bg-red-500/12 text-red-300 shadow-red-500/25',
    HIGH: 'border-orange-400/40 bg-orange-500/12 text-orange-300 shadow-orange-500/25',
    MEDIUM: 'border-amber-400/40 bg-amber-500/12 text-amber-300 shadow-amber-500/20',
    LOW: 'border-cyan-300/40 bg-cyan-400/10 text-cyan-200 shadow-cyan-500/20',
    UNKNOWN: 'border-slate-500/25 bg-slate-900/45 text-slate-400 shadow-none',
  };
  const normalized = severity.toUpperCase();

  return (
    <span className={`inline-flex min-w-20 items-center justify-center rounded-sm border px-2 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] shadow-lg ${colors[normalized as keyof typeof colors] || colors.UNKNOWN}`}>
      {normalized}
    </span>
  );
}
