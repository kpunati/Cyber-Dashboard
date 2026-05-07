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

const provenanceLabels: Record<string, string> = {
  CISA_KEV: 'CISA KEV',
  NVD: 'NVD',
  NVD_TARGETED: 'NVD',
  GITHUB_ADVISORY: 'GitHub',
  EPSS: 'FIRST EPSS',
  EPSS_TARGETED: 'FIRST EPSS',
  CISA_VULNRICHMENT: 'CISA Vulnrichment',
  CVE_PROJECT: 'CVE Project',
  OSV: 'OSV',
  VULNCHECK: 'VulnCheck',
};

function getRadarNodeColor(item: ThreatItem, severity: ThreatItem['severity']) {
  if (item.isKnownExploited && severity === 'UNKNOWN') {
    return '#fbbf24';
  }

  return severityColor[severity ?? 'UNKNOWN'];
}

function provenanceLabel(source?: string) {
  if (!source) return 'Public source unavailable';
  return provenanceLabels[source] ?? source;
}

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
  mode: 'hover' | 'pinned';
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
  const exploitedSignalCount = radarItems.filter(item => item.isKnownExploited).length;
  const highEpssSignalCount = radarItems.filter(item => (item.epssScore ?? 0) >= 0.5 || (item.epssPercentile ?? 0) >= 0.95).length;
  const [activeSignal, setActiveSignal] = useState<ActiveSignal | null>(null);
  const activeItem = activeSignal ? radarItems.find(item => item.id === activeSignal.id) : undefined;
  const tooltipLeft = activeSignal ? Math.min(Math.max((activeSignal.x / 300) * 100, 16), 84) : 50;
  const tooltipTop = activeSignal ? Math.min(Math.max((activeSignal.y / 300) * 100, 20), 78) : 50;
  const tooltipTransform = activeSignal && activeSignal.x > 170 ? 'translate(calc(-100% - 12px), -46%)' : 'translate(12px, -46%)';

  return (
    <div className="panel flex h-full flex-col rounded-xl border border-amber-500/30 bg-[#050809] p-3 shadow-[0_0_42px_rgba(245,158,11,0.08)]" id="radar">
      <div className="mb-3 flex items-center justify-between gap-4 border-b border-amber-500/10 pb-2">
        <div>
          <h2 className="text-base font-black uppercase tracking-tight text-amber-300">
            Threat Radar <span className="font-normal text-slate-500">ⓘ</span>
          </h2>
          <p className="mt-0.5 hidden text-[0.62rem] uppercase tracking-[0.24em] text-slate-600 sm:block">
            Exploited and probable public CVE signals
          </p>
        </div>
        <div className="hidden text-right text-[0.62rem] uppercase tracking-[0.28em] text-slate-500 sm:block">
          Active CVE signals
          <span className="mt-1 block font-mono text-sm font-bold tracking-normal text-amber-200">{radarItems.length}</span>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-[142px_1fr]">
        <div className="order-2 rounded-lg border border-amber-500/15 bg-[linear-gradient(180deg,rgba(251,191,36,0.08),rgba(0,0,0,0.22))] p-3 xl:order-1">
          <div className="grid grid-cols-2 gap-2 border-b border-amber-500/10 pb-3 text-center">
            <div className="rounded border border-amber-500/10 bg-black/25 py-2">
              <p className="text-[0.52rem] uppercase tracking-[0.16em] text-slate-500">KEV</p>
              <p className="font-mono text-lg font-black leading-none text-amber-200">{exploitedSignalCount}</p>
            </div>
            <div className="rounded border border-cyan-300/10 bg-black/25 py-2">
              <p className="text-[0.52rem] uppercase tracking-[0.16em] text-slate-500">EPSS</p>
              <p className="font-mono text-lg font-black leading-none text-cyan-200">{highEpssSignalCount}</p>
            </div>
          </div>
          <div className="mt-3 space-y-3 text-[0.7rem] font-bold uppercase tracking-[0.13em] text-slate-300">
            {Object.entries(severityColor).slice(0, 4).map(([severity, color]) => (
              <div key={severity} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full shadow-lg" style={{ backgroundColor: color, boxShadow: `0 0 14px ${color}` }} />
                  {severity}
                </span>
                <span className="h-px flex-1 bg-amber-500/10" />
              </div>
            ))}
            <div className="mt-3 space-y-3 border-t border-amber-500/10 pt-3">
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-red-300 bg-red-400/10 shadow-[0_0_14px_rgba(248,113,113,0.36)]" />
                <span>Known exploited</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-cyan-300 bg-cyan-300/10 shadow-[0_0_14px_rgba(103,232,249,0.3)]" />
                <span>High EPSS</span>
              </div>
            </div>
          </div>
        </div>

        <div
          className="relative order-1 min-h-[420px] overflow-hidden rounded-lg border border-amber-500/20 bg-[radial-gradient(circle_at_50%_54%,rgba(245,158,11,0.2),rgba(9,10,9,0.82)_45%,rgba(2,5,6,0.99)_78%)] p-3 shadow-[inset_0_0_60px_rgba(0,0,0,0.58)] xl:order-2 xl:h-full"
          onMouseLeave={() => setActiveSignal(null)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setActiveSignal(null);
            }
          }}
        >
          <div className="pointer-events-none absolute inset-0 opacity-70 bg-[linear-gradient(rgba(251,191,36,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(251,191,36,0.045)_1px,transparent_1px)] bg-[size:28px_28px]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_37%_36%,rgba(251,191,36,0.32),transparent_1.2px),radial-gradient(circle_at_57%_42%,rgba(251,191,36,0.26),transparent_1.2px),radial-gradient(circle_at_45%_60%,rgba(251,191,36,0.22),transparent_1px),radial-gradient(circle_at_67%_62%,rgba(251,191,36,0.18),transparent_1px)] bg-[length:62px_48px,82px_62px,92px_72px,110px_80px]" />
          <div className="pointer-events-none absolute left-4 top-3 font-mono text-[0.58rem] uppercase tracking-[0.22em] text-amber-200/50">
            orbital threat projection
          </div>
          <svg viewBox="0 0 300 300" className="relative mx-auto aspect-square h-full min-h-[390px] w-full max-w-[640px] drop-shadow-[0_0_26px_rgba(245,158,11,0.12)]">
            <defs>
              <filter id="nodeGlow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="3.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <clipPath id="radarDisc">
                <circle cx="150" cy="150" r="128" />
              </clipPath>
              <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#facc15" stopOpacity="0.42" />
                <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="sweep" x1="150" y1="150" x2="278" y2="150" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#facc15" stopOpacity="0.5" />
                <stop offset="52%" stopColor="#f59e0b" stopOpacity="0.24" />
                <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
              </linearGradient>
              <radialGradient id="landGlow" cx="50%" cy="45%" r="58%">
                <stop offset="0%" stopColor="#facc15" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="150" cy="150" r="133" fill="#050607" opacity="0.72" />
            <circle cx="150" cy="150" r="128" fill="url(#landGlow)" opacity="0.95" />
            <circle cx="150" cy="150" r="128" fill="none" stroke="#fbbf24" strokeWidth="0.8" opacity="0.34" />
            <g clipPath="url(#radarDisc)">
              <rect x="22" y="22" width="256" height="256" fill="url(#landGlow)" opacity="0.34" />
              {landMassPaths.map(path => (
                <path key={path} d={path} fill="#f59e0b" opacity="0.085" stroke="#fbbf24" strokeWidth="0.18" strokeOpacity="0.18" />
              ))}
              <g opacity="0.95">
                {mapClusters.map((cluster, clusterIndex) => (
                  <g key={`${cluster.cx}-${cluster.cy}`}>
                    {Array.from({ length: cluster.dots }).map((_, dotIndex) => {
                      const dot = getClusterDot(clusterIndex, dotIndex, cluster);
                      return (
                        <circle
                          key={dotIndex}
                          cx={dot.x}
                          cy={dot.y}
                          r={dotIndex % 9 === 0 ? 1.05 : 0.72}
                          fill="#facc15"
                          opacity={dot.opacity + 0.08}
                        />
                      );
                    })}
                  </g>
                ))}
              </g>
            </g>
            {[125, 105, 84, 63, 42, 21].map((radius, index) => (
              <circle key={radius} cx="150" cy="150" r={radius} fill="none" stroke="#f59e0b" strokeWidth={index === 0 ? 0.9 : 0.62} opacity={0.44 - index * 0.035} />
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
                  opacity="0.24"
                />
              );
            })}
            <line x1="24" y1="150" x2="276" y2="150" stroke="#fbbf24" strokeWidth="0.75" opacity="0.32" />
            <line x1="150" y1="24" x2="150" y2="276" stroke="#fbbf24" strokeWidth="0.75" opacity="0.3" />
            <ellipse cx="150" cy="150" rx="62" ry="124" fill="none" stroke="#f59e0b" strokeWidth="0.7" opacity="0.4" />
            <ellipse cx="150" cy="150" rx="34" ry="124" fill="none" stroke="#f59e0b" strokeWidth="0.48" opacity="0.25" />
            <ellipse cx="150" cy="150" rx="95" ry="124" fill="none" stroke="#f59e0b" strokeWidth="0.45" opacity="0.18" />
            <ellipse cx="150" cy="150" rx="124" ry="62" fill="none" stroke="#f59e0b" strokeWidth="0.6" opacity="0.26" />
            <ellipse cx="150" cy="150" rx="124" ry="32" fill="none" stroke="#f59e0b" strokeWidth="0.45" opacity="0.18" />
            <g className="origin-center">
              <animateTransform attributeName="transform" attributeType="XML" type="rotate" from="0 150 150" to="360 150 150" dur="9s" repeatCount="indefinite" />
              <path d="M150 150 L278 124 A128 128 0 0 1 252 228 Z" fill="url(#sweep)" />
              <line x1="150" y1="150" x2="274" y2="132" stroke="#facc15" strokeWidth="0.8" opacity="0.58" />
            </g>
            {radarItems.map((item, index) => {
              const { x, y, severity } = getRadarPoint(item, index);
              const nodeColor = getRadarNodeColor(item, severity);
              const scoreBoost = Math.min((item.epssScore ?? 0) * 5, 4);
              const nodeRadius = item.isKnownExploited ? 6.5 + scoreBoost : 4.5 + scoreBoost;
              const hoverSignal: ActiveSignal = { id: item.id, x, y, mode: 'hover' };
              const pinnedSignal: ActiveSignal = { id: item.id, x, y, mode: 'pinned' };
              const isHighEpss = (item.epssScore ?? 0) >= 0.5 || (item.epssPercentile ?? 0) >= 0.95;
              const isActive = activeSignal?.id === item.id;
              return (
                <g
                  key={item.id}
                  className="cursor-pointer outline-none"
                  onMouseEnter={() => {
                    setActiveSignal(current => current?.mode === 'pinned' ? current : hoverSignal);
                  }}
                  onMouseLeave={() => {
                    setActiveSignal(current => current?.id === item.id && current.mode === 'hover' ? null : current);
                  }}
                  onFocus={() => {
                    setActiveSignal(current => current?.mode === 'pinned' ? current : hoverSignal);
                  }}
                  onBlur={() => {
                    setActiveSignal(current => current?.id === item.id && current.mode === 'hover' ? null : current);
                  }}
                  onClick={() => {
                    setActiveSignal(current => current?.id === item.id && current.mode === 'pinned' ? null : pinnedSignal);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setActiveSignal(current => current?.id === item.id && current.mode === 'pinned' ? null : pinnedSignal);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  focusable="true"
                  aria-label={`Show details for ${item.cveId || item.id}`}
                >
                  <circle cx={x} cy={y} r={nodeRadius + 9} fill="url(#glow)" className={item.isKnownExploited ? 'radar-pulse' : ''} opacity={isActive ? 1 : 0.82} />
                  <circle cx={x} cy={y} r={nodeRadius + 1.8} fill="#020617" opacity="0.8" />
                  <circle cx={x} cy={y} r={nodeRadius} fill={nodeColor} opacity="0.98" filter="url(#nodeGlow)" />
                  <circle cx={x} cy={y} r={nodeRadius * 0.42} fill="#fff7ed" opacity="0.34" />
                  {item.isKnownExploited && <circle cx={x} cy={y} r={nodeRadius + 4.4} fill="none" stroke="#fecaca" strokeWidth={isActive ? 1.9 : 1.35} opacity="0.92" />}
                  {isHighEpss && <circle cx={x} cy={y} r={nodeRadius + 7.2} fill="none" stroke="#67e8f9" strokeWidth={isActive ? 1.75 : 1.2} opacity="0.84" />}
                  {isActive && <circle cx={x} cy={y} r={nodeRadius + 11} fill="none" stroke="#facc15" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.9" />}
                </g>
              );
            })}
          </svg>
          {activeItem ? (
            <div
              className="pointer-events-none absolute z-20 w-56 rounded-md border border-amber-200/25 bg-[#080d0e]/90 p-3 shadow-2xl shadow-black/60 backdrop-blur-md"
              style={{
                left: `${tooltipLeft}%`,
                top: `${tooltipTop}%`,
                transform: tooltipTransform,
              }}
            >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-black text-white">{activeItem.cveId || activeItem.id}</p>
                    <h3 className="mt-1 line-clamp-2 text-xs font-semibold leading-4 text-slate-300">{activeItem.vendor || activeItem.packageName || activeItem.title}</h3>
                  </div>
                  <SeverityBadge severity={activeItem.severity || 'UNKNOWN'} />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5 text-[0.68rem] text-slate-300">
                  <p className="rounded bg-white/[0.03] px-2 py-1">EPSS <span className="block font-mono text-cyan-300">{activeItem.epssScore !== undefined ? `${Math.round(activeItem.epssScore * 100)}%` : '—'}</span></p>
                  <p className="rounded bg-white/[0.03] px-2 py-1">CVSS <span className="block font-mono text-white">{activeItem.cvssScore ?? '—'}</span></p>
                  <p className="col-span-2 rounded bg-white/[0.03] px-2 py-1">Severity source <span className="block truncate text-slate-400">{provenanceLabel(activeItem.severitySource)}</span></p>
                  <p className="col-span-2 rounded bg-white/[0.03] px-2 py-1">EPSS source <span className="block truncate text-slate-400">{provenanceLabel(activeItem.epssSource)}</span></p>
                  <p className="col-span-2 rounded bg-white/[0.03] px-2 py-1">Known exploited <span className={activeItem.isKnownExploited ? 'font-bold text-red-300' : 'text-slate-400'}>{activeItem.isKnownExploited ? 'Yes' : 'No'}</span></p>
                </div>
                <p className="mt-2 flex items-center justify-between text-[0.62rem] font-black uppercase tracking-[0.16em] text-amber-300">
                  <span>{activeSignal?.mode === 'pinned' ? 'Pinned signal' : 'Signal detail'}</span>
                  <span>View &gt;</span>
                </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
