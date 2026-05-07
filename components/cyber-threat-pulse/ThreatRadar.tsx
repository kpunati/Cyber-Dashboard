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
  { cx: 74, cy: 116, width: 54, height: 26, dots: 58 },
  { cx: 92, cy: 151, width: 36, height: 46, dots: 42 },
  { cx: 139, cy: 113, width: 34, height: 24, dots: 35 },
  { cx: 171, cy: 130, width: 62, height: 34, dots: 66 },
  { cx: 206, cy: 161, width: 42, height: 42, dots: 48 },
  { cx: 128, cy: 202, width: 35, height: 28, dots: 28 },
  { cx: 226, cy: 205, width: 30, height: 24, dots: 26 },
];

const landMassPaths = [
  'M48 116c16-23 48-29 75-18 16 7 20 21 8 34-20 21-66 22-84 6-8-7-8-15 1-22Z',
  'M82 151c16-7 31-2 36 12 7 20-3 44-17 56-8 7-19 2-22-10-5-17-12-50 3-58Z',
  'M130 109c17-16 49-15 69-3 13 8 12 20-1 29-20 14-53 9-68-7-6-7-6-13 0-19Z',
  'M159 133c19-15 66-16 83 0 16 15-2 33-25 39-27 7-63-1-72-17-4-7 1-15 14-22Z',
  'M193 166c20-9 45-4 52 14 8 20-7 42-28 42-20 0-36-18-35-36 0-8 4-15 11-20Z',
  'M111 195c15-10 37-5 45 8 8 14-2 30-19 33-18 3-38-6-42-21-2-8 3-15 16-20Z',
];

const radarAnchors = [
  { x: 70, y: 116 },
  { x: 90, y: 147 },
  { x: 118, y: 119 },
  { x: 156, y: 128 },
  { x: 189, y: 139 },
  { x: 219, y: 160 },
  { x: 203, y: 198 },
  { x: 133, y: 207 },
  { x: 95, y: 181 },
  { x: 172, y: 177 },
  { x: 228, y: 210 },
  { x: 58, y: 138 },
];

const severityRank = {
  CRITICAL: 5,
  HIGH: 4,
  MEDIUM: 3,
  LOW: 2,
  UNKNOWN: 1,
};

type ActiveSignal = {
  id: string;
  x: number;
  y: number;
};

function getRadarPoint(item: ThreatItem, index: number) {
  const severity = item.severity ?? 'UNKNOWN';
  const anchor = radarAnchors[index % radarAnchors.length];
  const seed = (index + 5) * 83;
  const normalizedX = ((seed * 17) % 100) / 100 - 0.5;
  const normalizedY = ((seed * 23) % 100) / 100 - 0.5;
  const epssLift = Math.min((item.epssScore ?? 0) * 12, 6);
  const severityPull = severityRank[severity] >= 4 ? 0.72 : 1;
  const x = anchor.x + normalizedX * 18 * severityPull;
  const y = anchor.y + normalizedY * 15 * severityPull - epssLift;

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

function getSignalKey(item: ThreatItem) {
  return item.cveId ?? item.id;
}

function byRadarPriority(a: ThreatItem, b: ThreatItem) {
  return (
    Number(Boolean(b.isKnownExploited)) - Number(Boolean(a.isKnownExploited)) ||
    severityRank[b.severity ?? 'UNKNOWN'] - severityRank[a.severity ?? 'UNKNOWN'] ||
    (b.epssScore ?? 0) - (a.epssScore ?? 0) ||
    getSignalKey(a).localeCompare(getSignalKey(b))
  );
}

function addUniqueSignals(target: ThreatItem[], source: ThreatItem[], limit: number) {
  source.slice(0, limit).forEach(item => {
    const key = getSignalKey(item);
    if (!target.some(existing => getSignalKey(existing) === key)) {
      target.push(item);
    }
  });
}

function getRadarItems(data: CyberDashboardData) {
  const selected: ThreatItem[] = [];
  const exploited = [...data.exploited].sort(byRadarPriority);
  const recent = [...data.recentCves]
    .filter(item => item.severity && item.severity !== 'UNKNOWN')
    .sort(byRadarPriority);
  const advisories = [...data.advisories]
    .filter(item => item.severity && item.severity !== 'UNKNOWN')
    .sort(byRadarPriority);
  const epss = [...data.epssLeaderboard].sort(byRadarPriority);

  addUniqueSignals(selected, exploited, 5);
  addUniqueSignals(selected, recent, 5);
  addUniqueSignals(selected, advisories, 5);
  addUniqueSignals(selected, epss, 5);

  if (selected.length < 16) {
    addUniqueSignals(
      selected,
      [...data.exploited, ...data.recentCves, ...data.advisories, ...data.epssLeaderboard].sort(byRadarPriority),
      20,
    );
  }

  return selected.slice(0, 18);
}

export default function ThreatRadar({ data }: ThreatRadarProps) {
  const radarItems = getRadarItems(data);
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
          className="relative order-1 min-h-[390px] overflow-hidden rounded border border-amber-500/15 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.14),rgba(9,10,9,0.82)_47%,rgba(2,5,6,0.98)_80%)] p-4 xl:order-2"
          onMouseLeave={() => setActiveSignal(null)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setActiveSignal(null);
            }
          }}
        >
          <div className="pointer-events-none absolute inset-0 opacity-60 bg-[linear-gradient(rgba(251,191,36,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(251,191,36,0.04)_1px,transparent_1px)] bg-[size:32px_32px]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_37%_36%,rgba(251,191,36,0.28),transparent_1.3px),radial-gradient(circle_at_57%_42%,rgba(251,191,36,0.25),transparent_1.2px),radial-gradient(circle_at_45%_60%,rgba(251,191,36,0.22),transparent_1.1px),radial-gradient(circle_at_67%_62%,rgba(251,191,36,0.18),transparent_1.1px)] bg-[length:70px_52px,86px_64px,92px_72px,110px_80px]" />
          <svg viewBox="0 0 300 300" className="relative mx-auto aspect-square h-full min-h-[360px] w-full max-w-[560px]">
            <defs>
              <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#facc15" stopOpacity="0.42" />
                <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="sweep" x1="150" y1="150" x2="270" y2="150" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#facc15" stopOpacity="0.44" />
                <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
              </linearGradient>
              <radialGradient id="landGlow" cx="50%" cy="45%" r="58%">
                <stop offset="0%" stopColor="#facc15" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="150" cy="150" r="128" fill="url(#landGlow)" opacity="0.85" />
            {landMassPaths.map(path => (
              <path key={path} d={path} fill="#f59e0b" opacity="0.055" />
            ))}
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
            <ellipse cx="150" cy="150" rx="34" ry="124" fill="none" stroke="#f59e0b" strokeWidth="0.45" opacity="0.22" />
            <ellipse cx="150" cy="150" rx="95" ry="124" fill="none" stroke="#f59e0b" strokeWidth="0.45" opacity="0.18" />
            <ellipse cx="150" cy="150" rx="124" ry="62" fill="none" stroke="#f59e0b" strokeWidth="0.6" opacity="0.22" />
            <ellipse cx="150" cy="150" rx="124" ry="32" fill="none" stroke="#f59e0b" strokeWidth="0.45" opacity="0.18" />
            <g className="radar-sweep origin-center">
              <path d="M150 150 L274 132 A125 125 0 0 1 250 223 Z" fill="url(#sweep)" />
              <line x1="150" y1="150" x2="274" y2="132" stroke="#facc15" strokeWidth="0.8" opacity="0.58" />
            </g>
            {radarItems.map((item, index) => {
              const { x, y, severity } = getRadarPoint(item, index);
              const scoreBoost = Math.min((item.epssScore ?? 0) * 5, 4);
              const nodeRadius = item.isKnownExploited ? 6.5 + scoreBoost : 4.5 + scoreBoost;
              const signal = { id: item.id, x, y };
              const isHighEpss = (item.epssScore ?? 0) >= 0.5 || (item.epssPercentile ?? 0) >= 0.95;
              return (
                <g
                  key={item.id}
                  className="cursor-pointer outline-none"
                  onMouseEnter={() => setActiveSignal(signal)}
                  onMouseLeave={() => {
                    setActiveSignal(current => current?.id === item.id ? null : current);
                  }}
                  onFocus={() => setActiveSignal(signal)}
                  onBlur={() => {
                    setActiveSignal(current => current?.id === item.id ? null : current);
                  }}
                  onClick={() => setActiveSignal(current => current?.id === item.id ? null : signal)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Show details for ${item.cveId || item.id}`}
                >
                  <circle cx={x} cy={y} r={nodeRadius + 8} fill="url(#glow)" className={item.isKnownExploited ? 'radar-pulse' : ''} />
                  <circle cx={x} cy={y} r={nodeRadius} fill={severityColor[severity]} opacity="0.96" />
                  {item.isKnownExploited && <circle cx={x} cy={y} r={nodeRadius + 4} fill="none" stroke="#fecaca" strokeWidth="1" opacity="0.75" />}
                  {isHighEpss && <circle cx={x} cy={y} r={nodeRadius + 7} fill="none" stroke="#67e8f9" strokeWidth="1.2" opacity="0.82" />}
                </g>
              );
            })}
          </svg>
          {activeItem ? (
            <div
              className="pointer-events-none absolute z-20 w-64 rounded-lg border border-slate-600/80 bg-[#0b1112]/95 p-4 shadow-2xl shadow-black/50"
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
