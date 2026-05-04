'use client';

import { useState } from 'react';
import { CyberDashboardData, ThreatItem } from '@/lib/cyber/types';
import SeverityBadge from './SeverityBadge';

interface ThreatRadarProps {
  data: CyberDashboardData;
}

const severityColor = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#fbbf24',
  LOW: '#38d5d7',
  UNKNOWN: '#64748b',
};

const mapClusters = [
  { cx: 78, cy: 112, width: 48, height: 28, dots: 42 },
  { cx: 96, cy: 150, width: 34, height: 42, dots: 30 },
  { cx: 149, cy: 118, width: 42, height: 30, dots: 38 },
  { cx: 182, cy: 139, width: 52, height: 36, dots: 46 },
  { cx: 210, cy: 176, width: 34, height: 30, dots: 24 },
  { cx: 124, cy: 207, width: 30, height: 25, dots: 20 },
];

type ActiveSignal = {
  id: string;
  x: number;
  y: number;
};

function getRadarPoint(item: ThreatItem, index: number) {
  const severity = item.severity ?? 'UNKNOWN';
  const cluster = mapClusters[index % mapClusters.length];
  const seed = (index + 3) * 71;
  const normalizedX = ((seed * 19) % 100) / 100 - 0.5;
  const normalizedY = ((seed * 31) % 100) / 100 - 0.5;
  const epssLift = Math.min((item.epssScore ?? 0) * 10, 4);
  const kevPull = item.isKnownExploited ? 0.88 : 1;
  const x = cluster.cx + normalizedX * cluster.width * kevPull;
  const y = cluster.cy + normalizedY * cluster.height - epssLift;

  return {
    x: Math.min(Math.max(x, 28), 272),
    y: Math.min(Math.max(y, 34), 266),
    severity,
  };
}

function getClusterDot(clusterIndex: number, dotIndex: number, cluster: typeof mapClusters[number]) {
  const seed = (clusterIndex + 1) * 97 + dotIndex * 37;
  const normalizedX = ((seed * 29) % 100) / 100 - 0.5;
  const normalizedY = ((seed * 43) % 100) / 100 - 0.5;
  const taper = 1 - Math.min(Math.abs(normalizedY) * 0.85, 0.4);
  return {
    x: cluster.cx + normalizedX * cluster.width * taper,
    y: cluster.cy + normalizedY * cluster.height,
    opacity: 0.18 + (((seed * 11) % 7) / 100),
  };
}

export default function ThreatRadar({ data }: ThreatRadarProps) {
  const radarItems = [...data.exploited, ...data.epssLeaderboard]
    .filter((item, index, items) => items.findIndex(candidate => candidate.id === item.id) === index)
    .sort((a, b) => (b.epssScore ?? 0) - (a.epssScore ?? 0))
    .slice(0, 14);
  const [activeSignal, setActiveSignal] = useState<ActiveSignal | null>(null);
  const activeItem = activeSignal ? radarItems.find(item => item.id === activeSignal.id) : undefined;
  const tooltipLeft = activeSignal ? Math.min(Math.max((activeSignal.x / 300) * 100, 16), 84) : 50;
  const tooltipTop = activeSignal ? Math.min(Math.max((activeSignal.y / 300) * 100, 18), 82) : 50;
  const tooltipTransform = activeSignal && activeSignal.x > 180 ? 'translate(-105%, -50%)' : 'translate(14px, -50%)';

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
          className="relative order-1 min-h-[440px] overflow-hidden rounded border border-amber-500/15 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.13),rgba(9,10,9,0.8)_45%,rgba(2,5,6,0.98)_78%)] p-4 xl:order-2"
          onMouseLeave={() => setActiveSignal(null)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setActiveSignal(null);
            }
          }}
        >
          <div className="pointer-events-none absolute inset-0 opacity-60 bg-[linear-gradient(rgba(251,191,36,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(251,191,36,0.04)_1px,transparent_1px)] bg-[size:32px_32px]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_37%_36%,rgba(251,191,36,0.28),transparent_1.3px),radial-gradient(circle_at_57%_42%,rgba(251,191,36,0.25),transparent_1.2px),radial-gradient(circle_at_45%_60%,rgba(251,191,36,0.22),transparent_1.1px),radial-gradient(circle_at_67%_62%,rgba(251,191,36,0.18),transparent_1.1px)] bg-[length:70px_52px,86px_64px,92px_72px,110px_80px]" />
          <svg viewBox="0 0 300 300" className="relative mx-auto h-full min-h-[410px] w-full max-w-[600px]">
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
            <g opacity="0.85">
              {mapClusters.map((cluster, clusterIndex) => (
                <g key={`${cluster.cx}-${cluster.cy}`}>
                  {Array.from({ length: cluster.dots }).map((_, dotIndex) => {
                    const dot = getClusterDot(clusterIndex, dotIndex, cluster);
                    return (
                      <circle
                        key={dotIndex}
                        cx={dot.x}
                        cy={dot.y}
                        r="0.8"
                        fill="#facc15"
                        opacity={dot.opacity}
                      />
                    );
                  })}
                </g>
              ))}
            </g>
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
              const { x, y, severity } = getRadarPoint(item, index);
              const scoreBoost = Math.min((item.epssScore ?? 0) * 5, 4);
              const nodeRadius = item.isKnownExploited ? 6.5 + scoreBoost : 4.5 + scoreBoost;
              const signal = { id: item.id, x, y };
              return (
                <g
                  key={item.id}
                  className="cursor-pointer outline-none"
                  onMouseEnter={() => setActiveSignal(signal)}
                  onFocus={() => setActiveSignal(signal)}
                  onClick={() => setActiveSignal(current => current?.id === item.id ? null : signal)}
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
            <div
              className="absolute z-20 w-64 rounded-lg border border-slate-600/80 bg-[#0b1112]/95 p-4 shadow-2xl shadow-black/50"
              style={{
                left: `${tooltipLeft}%`,
                top: `${tooltipTop}%`,
                transform: tooltipTransform,
              }}
            >
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
