interface SeverityBadgeProps {
  severity: string;
}

export default function SeverityBadge({ severity }: SeverityBadgeProps) {
  const colors = {
    CRITICAL: 'border-red-400/35 bg-red-500/10 text-red-400 shadow-red-500/20',
    HIGH: 'border-orange-400/35 bg-orange-500/10 text-orange-300 shadow-orange-500/20',
    MEDIUM: 'border-amber-400/35 bg-amber-500/10 text-amber-300 shadow-amber-500/20',
    LOW: 'border-cyan-300/35 bg-cyan-400/10 text-cyan-200 shadow-cyan-500/20',
    UNKNOWN: 'border-slate-400/20 bg-slate-500/10 text-slate-300 shadow-slate-500/10',
  };
  const normalized = severity.toUpperCase();

  return (
    <span className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-[0.08em] shadow-lg ${colors[normalized as keyof typeof colors] || colors.UNKNOWN}`}>
      {normalized}
    </span>
  );
}
