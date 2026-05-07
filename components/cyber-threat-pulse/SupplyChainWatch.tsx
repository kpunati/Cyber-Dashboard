'use client';

import { ThreatItem } from '@/lib/cyber/types';
import SeverityBadge from './SeverityBadge';

interface SupplyChainWatchProps {
  items: ThreatItem[];
  maxAdvisories?: number;
}

export default function SupplyChainWatch({ items, maxAdvisories = 5 }: SupplyChainWatchProps) {
  const ecosystemCounts = items.reduce((acc, item) => {
    const ecosystem = item.ecosystem || 'Other';
    acc[ecosystem] = (acc[ecosystem] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const ecosystemData = Object.entries(ecosystemCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  const total = items.length;
  let offset = 25;
  const palette = ['#ef4444', '#f97316', '#fbbf24', '#38d5d7', '#64748b'];
  const isExpanded = maxAdvisories > 5;
  const displayedAdvisories = items.slice(0, maxAdvisories);
  const emptyStateClass = 'rounded border border-dashed border-amber-500/20 bg-black/30 px-4 py-8 text-center text-sm text-slate-400';

  return (
    <div className="panel supply-chain rounded-lg border border-amber-500/25 bg-[#070b0c] p-3">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="text-base font-bold uppercase text-amber-300">Supply Chain Watch <span className="font-normal text-slate-400">(GitHub Advisories)</span></h2>
      </div>
      <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="min-h-[13rem] rounded border border-amber-500/20 bg-black/25">
          <div className="border-b border-amber-500/20 bg-[#171407] px-3 py-2 text-[0.66rem] font-black uppercase tracking-[0.18em] text-amber-300">
            Top ecosystems
          </div>
          {total === 0 ? (
            <div className="p-3">
              <div className={emptyStateClass}>
                No ecosystems match the active filters.
              </div>
            </div>
          ) : (
          <div className="grid gap-4 p-3 sm:grid-cols-[9rem_1fr] sm:items-center">
            <div className="relative mx-auto h-32 w-32 sm:h-36 sm:w-36">
              <svg viewBox="0 0 120 120" className="-rotate-90 drop-shadow-[0_0_18px_rgba(251,191,36,0.08)]">
                <circle cx="60" cy="60" r="39" fill="none" stroke="#0f172a" strokeWidth="18" />
                {ecosystemData.map(([ecosystem, count], index) => {
                  const circumference = 2 * Math.PI * 39;
                  const percentage = total ? count / total : 0;
                  const dash = percentage * circumference;
                  const currentOffset = offset;
                  offset -= percentage * 100;
                  return (
                    <circle
                      key={ecosystem}
                      cx="60"
                      cy="60"
                      r="39"
                      fill="none"
                      stroke={palette[index]}
                      strokeWidth="18"
                      strokeDasharray={`${dash} ${circumference - dash}`}
                      strokeDashoffset={currentOffset}
                      strokeLinecap="butt"
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold text-white">{total}</span>
                <span className="text-xs text-slate-400">Total</span>
              </div>
            </div>
            <div className="space-y-2.5">
              {ecosystemData.map(([ecosystem, count], index) => (
                <div key={ecosystem} className="grid grid-cols-[1fr_auto] items-center gap-3 text-xs">
                  <span className="flex min-w-0 items-center gap-2 text-slate-300">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: palette[index] }} />
                    <span className="truncate">{ecosystem}</span>
                  </span>
                  <span className="font-mono text-slate-400">{count} ({total ? Math.round((count / total) * 100) : 0}%)</span>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>

        <div className="min-h-[13rem] rounded border border-amber-500/20 bg-black/25">
          <div className="border-b border-amber-500/20 bg-[#171407] px-3 py-2 text-[0.66rem] font-black uppercase tracking-[0.18em] text-amber-300">
            Latest advisories
          </div>
          <div className={`${isExpanded ? 'max-h-80 overflow-y-auto pr-2' : 'max-h-56 overflow-hidden'} p-3`}>
        {items.length === 0 ? (
          <div className={emptyStateClass}>
            No open-source advisories match the active filters.
          </div>
        ) : displayedAdvisories.map(item => (
          <div key={item.id} className="border-b border-amber-500/10 py-2.5 last:border-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-xs font-semibold text-slate-300">{item.id}</p>
                <p className="mt-1 line-clamp-1 text-xs leading-5 text-slate-400">{item.packageName || item.title}</p>
              </div>
              <SeverityBadge severity={item.severity || 'UNKNOWN'} />
            </div>
          </div>
        ))}
          </div>
        </div>
      </div>
    </div>
  );
}
