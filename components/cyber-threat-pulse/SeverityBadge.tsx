interface SeverityBadgeProps {
  severity: string;
}

export default function SeverityBadge({ severity }: SeverityBadgeProps) {
  const colors = {
    CRITICAL: 'border-red-400/60 bg-red-500/[0.14] text-red-200 shadow-[0_0_18px_rgba(248,113,113,0.24)]',
    HIGH: 'border-orange-400/50 bg-orange-500/[0.14] text-orange-200 shadow-[0_0_16px_rgba(251,146,60,0.22)]',
    MEDIUM: 'border-amber-300/50 bg-amber-500/[0.14] text-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.18)]',
    LOW: 'border-cyan-300/50 bg-cyan-400/[0.12] text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.18)]',
    UNKNOWN: 'border-slate-500/30 bg-slate-900/50 text-slate-300 shadow-none',
  };
  const normalized = severity.toUpperCase();

  return (
    <span className={`inline-flex min-w-20 items-center justify-center rounded-[0.22rem] border px-2.5 py-1 font-mono text-[0.65rem] font-black uppercase tracking-[0.16em] ${colors[normalized as keyof typeof colors] || colors.UNKNOWN}`}>
      {normalized}
    </span>
  );
}
