'use client';

import { useState } from 'react';
import { CyberDashboardData } from '@/lib/cyber/types';
import SeverityBadge from './SeverityBadge';

interface ThreatRadarProps {
  data: CyberDashboardData;
}

const severityRadius = {
  CRITICAL: 118,
  HIGH: 94,
  MEDIUM: 68,
  LOW: 44,
  UNKNOWN: 54,
};

const severityColor = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#fbbf24',
  LOW: '#38d5d7',
  UNKNOWN: '#64748b',
};

export default function ThreatRadar({ data }: ThreatRadarProps) {
  const radarItems = [...data.exploited, ...data.epssLeaderboard]
    .filter((item, index, items) => items.findIndex(candidate => candidate.id === item.id) === index)
    .sort((a, b) => (b.epssScore ?? 0) - (a.epssScore ?? 0))
    .slice(0, 14);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeItem = activeId ? radarItems.find(item => item.id === activeId) : undefined;

  return (
    <div className="panel rounded-lg border border-amber-500/25 bg-[#070b0c] p-3" id="radar">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="text-base font-bold uppercase text-amber-300">Threat Radar <span className="font-normal text-slate-500">ⓘ</span></h2>
        <div className="hidden text-right text-[0.66rem] uppercase tracking-[0.2em] text-slate-500 sm:block">
          Active CVE signals
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[150px_1fr]">
        <div className="order-2 space-y-4 rounded border border-amber-500/10 bg-black/20 p-4 xl:order-1">
          <div className="space-y-4 text-xs uppercase tracking-[0.08em] text-slate-300">
            {Object.entries(severityColor).slice(0, 4).map(([severity, color]) => (
              <div key={severity} className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full shadow-lg" style={{ backgroundColor: color, boxShadow: `0 0 14px ${color}` }} />
                {severity}
              </div>
            ))}
            <div className="flex items-center gap-3 pt-3">
              <span className="h-5 w-5 rounded-full border-2 border-red-400" />
              <span>Known exploited</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-5 w-5 rounded-full border-2 border-cyan-300" />
              <span>High EPSS</span>
            </div>
          </div>
        </div>

        <div
          className="relative order-1 min-h-[430px] overflow-hidden rounded border border-amber-500/15 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.12),rgba(9,10,9,0.8)_45%,rgba(2,5,6,0.98)_78%)] p-4 xl:order-2"
          onMouseLeave={() => setActiveId(null)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setActiveId(null);
            }
          }}
        >
          <div className="pointer-events-none absolute inset-0 opacity-60 bg-[linear-gradient(rgba(251,191,36,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(251,191,36,0.04)_1px,transparent_1px)] bg-[size:32px_32px]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_37%_36%,rgba(251,191,36,0.28),transparent_1.3px),radial-gradient(circle_at_57%_42%,rgba(251,191,36,0.25),transparent_1.2px),radial-gradient(circle_at_45%_60%,rgba(251,191,36,0.22),transparent_1.1px),radial-gradient(circle_at_67%_62%,rgba(251,191,36,0.18),transparent_1.1px)] bg-[length:70px_52px,86px_64px,92px_72px,110px_80px]" />
          <svg viewBox="0 0 300 300" className="relative mx-auto h-full min-h-[400px] w-full max-w-[560px]">
            <defs>
              <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#facc15" stopOpacity="0.42" />
                <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="sweep" x1="150" y1="150" x2="270" y2="150" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#facc15" stopOpacity="0.68" />
                <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[125, 105, 84, 63, 42, 21].map((radius, index) => (
              <circle key={radius} cx="150" cy="150" r={radius} fill="none" stroke="#f59e0b" strokeWidth="0.7" opacity={0.38 - index * 0.035} />
            ))}
            {Array.from({ length: 12 }).map((_, index) => {
              const angle = (index * 30 * Math.PI) / 180;
              return (
                <line
                  key={index}
                  x1={150 - 126 * Math.cos(angle)}
                  y1={150 - 126 * Math.sin(angle)}
                  x2={150 + 126 * Math.cos(angle)}
                  y2={150 + 126 * Math.sin(angle)}
                  stroke="#f59e0b"
                  strokeWidth="0.45"
                  opacity="0.2"
                />
              );
            })}
            <ellipse cx="150" cy="150" rx="62" ry="124" fill="none" stroke="#f59e0b" strokeWidth="0.6" opacity="0.35" />
            <ellipse cx="150" cy="150" rx="124" ry="62" fill="none" stroke="#f59e0b" strokeWidth="0.6" opacity="0.22" />
            <g className="radar-sweep origin-center">
              <path d="M150 150 L272 150 A122 122 0 0 1 236 236 Z" fill="url(#sweep)" />
            </g>
            {radarItems.map((item, index) => {
              const severity = item.severity ?? 'UNKNOWN';
              const degrees = (360 / Math.max(radarItems.length, 1)) * index - 90;
              const radius = severityRadius[severity];
              const x = 150 + radius * Math.cos((degrees * Math.PI) / 180);
              const y = 150 + radius * Math.sin((degrees * Math.PI) / 180);
              const scoreBoost = Math.min((item.epssScore ?? 0) * 5, 4);
              const nodeRadius = item.isKnownExploited ? 6.5 + scoreBoost : 4.5 + scoreBoost;
              return (
                <g
                  key={item.id}
                  className="cursor-pointer outline-none"
                  onMouseEnter={() => setActiveId(item.id)}
                  onFocus={() => setActiveId(item.id)}
                  onClick={() => setActiveId(currentId => currentId === item.id ? null : item.id)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Show details for ${item.cveId || item.id}`}
                >
                  <circle cx={x} cy={y} r={nodeRadius + 8} fill="url(#glow)" className={item.isKnownExploited ? 'radar-pulse' : ''} />
                  <circle cx={x} cy={y} r={nodeRadius} fill={severityColor[severity]} opacity="0.96" />
                  {item.isKnownExploited && <circle cx={x} cy={y} r={nodeRadius + 4} fill="none" stroke="#fecaca" strokeWidth="1" opacity="0.75" />}
                </g>
              );
            })}
          </svg>
          {activeItem ? (
            <div className="absolute bottom-6 right-6 w-64 rounded-lg border border-slate-600/80 bg-[#0b1112]/95 p-4 shadow-2xl shadow-black/50">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-base font-semibold text-white">{activeItem.cveId || activeItem.id}</p>
                    <h3 className="mt-1 text-sm font-medium leading-5 text-slate-300">{activeItem.vendor || activeItem.packageName || activeItem.title}</h3>
                  </div>
                  <SeverityBadge severity={activeItem.severity || 'UNKNOWN'} />
                </div>
                <div className="mt-3 space-y-1 text-xs text-slate-300">
                  <p>EPSS: <span className="text-cyan-300">{activeItem.epssScore !== undefined ? `${Math.round(activeItem.epssScore * 100)}%` : '—'}</span></p>
                  <p>CVSS: <span className="text-white">{activeItem.cvssScore ?? '—'}</span></p>
                  <p>Known Exploited: <span className={activeItem.isKnownExploited ? 'text-red-400' : 'text-slate-400'}>{activeItem.isKnownExploited ? 'Yes' : 'No'}</span></p>
                  <p>Added to KEV: <span className="text-white">{activeItem.dateAddedToKev ?? '—'}</span></p>
                </div>
                <p className="mt-3 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-amber-300">View details &gt;</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
