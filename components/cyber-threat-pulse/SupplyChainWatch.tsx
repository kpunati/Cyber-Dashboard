'use client';

import { ThreatItem } from '@/lib/cyber/types';
import SeverityBadge from './SeverityBadge';

interface SupplyChainWatchProps {
  items: ThreatItem[];
}

export default function SupplyChainWatch({ items }: SupplyChainWatchProps) {
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

  return (
    <div className="panel supply-chain rounded-lg border border-amber-500/25 bg-[#070b0c] p-3">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="text-base font-bold uppercase text-amber-300">Supply Chain Watch <span className="font-normal text-slate-400">(GitHub Advisories)</span></h2>
        <span className="text-xs text-amber-300">View all &gt;</span>
      </div>
      <div className="grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded border border-amber-500/20 bg-black/25">
          <div className="border-b border-amber-500/20 bg-amber-400/10 px-3 py-2 text-[0.66rem] font-bold uppercase tracking-[0.12em] text-amber-300">
            Top ecosystems
          </div>
          <div className="grid grid-cols-[120px_1fr] items-center gap-3 p-3">
            <div className="relative h-28 w-28">
              <svg viewBox="0 0 120 120" className="-rotate-90">
                <circle cx="60" cy="60" r="38" fill="none" stroke="#111827" strokeWidth="20" />
                {ecosystemData.map(([ecosystem, count], index) => {
                  const circumference = 2 * Math.PI * 38;
                  const percentage = total ? count / total : 0;
                  const dash = percentage * circumference;
                  const currentOffset = offset;
                  offset -= percentage * 100;
                  return (
                    <circle
                      key={ecosystem}
                      cx="60"
                      cy="60"
                      r="38"
                      fill="none"
                      stroke={palette[index]}
                      strokeWidth="20"
                      strokeDasharray={`${dash} ${circumference - dash}`}
                      strokeDashoffset={currentOffset}
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold text-white">{total}</span>
                <span className="text-xs text-slate-400">Total</span>
              </div>
            </div>
            <div className="space-y-2">
              {ecosystemData.map(([ecosystem, count], index) => (
                <div key={ecosystem} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-2 text-slate-300">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: palette[index] }} />
                    {ecosystem}
                  </span>
                  <span className="text-slate-400">{count} ({total ? Math.round((count / total) * 100) : 0}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded border border-amber-500/20 bg-black/25">
          <div className="border-b border-amber-500/20 bg-amber-400/10 px-3 py-2 text-[0.66rem] font-bold uppercase tracking-[0.12em] text-amber-300">
            Latest advisories
          </div>
          <div className="max-h-56 overflow-hidden p-3">
        {items.length === 0 ? (
          <div className="rounded border border-dashed border-amber-500/20 bg-black/30 px-4 py-8 text-center text-sm text-slate-400">
            No open-source advisories match the active filters.
          </div>
        ) : items.slice(0, 5).map(item => (
          <div key={item.id} className="border-b border-amber-500/10 py-2 last:border-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-slate-300">{item.id}</p>
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
