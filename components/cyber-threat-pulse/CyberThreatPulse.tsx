'use client';

import { useState, useEffect } from 'react';
import { CyberDashboardData, CyberSourceId, ThreatItem } from '@/lib/cyber/types';
import SidebarNav from './SidebarNav';
import ThreatRadar from './ThreatRadar';
import ThreatSummaryCards from './ThreatSummaryCards';
import SupplyChainWatch from './SupplyChainWatch';
import ThreatTimeline from './ThreatTimeline';
import ThreatTable from './ThreatTable';
import SeverityChart from './SeverityChart';
import EcosystemChart from './EcosystemChart';
import VendorChart from './VendorChart';
import CyberSkeleton from './CyberSkeleton';

type SeverityFilter = 'ALL' | NonNullable<ThreatItem['severity']>;
type SourceFilter = 'ALL' | CyberSourceId;
type ExpandablePanel = 'exploited' | 'epss' | 'recent' | 'supply';

const severityFilters: SeverityFilter[] = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const sourceFilters: { id: SourceFilter; label: string }[] = [
  { id: 'ALL', label: 'All sources' },
  { id: 'CISA_KEV', label: 'CISA KEV' },
  { id: 'NVD', label: 'NVD' },
  { id: 'GITHUB_ADVISORY', label: 'GitHub' },
  { id: 'EPSS', label: 'EPSS' },
];

const sourceShortLabels: Record<CyberSourceId, string> = {
  CISA_KEV: 'CISA KEV',
  NVD: 'NVD',
  GITHUB_ADVISORY: 'GitHub',
  EPSS: 'EPSS',
};

function formatTimestamp(timestamp: string) {
  const parsed = new Date(timestamp);
  if (!Number.isFinite(parsed.getTime())) return 'Timestamp unavailable';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed);
}

function cacheLabel(data: CyberDashboardData) {
  const sources = Object.values(data.sourceStatus);
  const fallbackCount = sources.filter(source => source.status === 'fallback').length;
  const errorCount = sources.filter(source => source.status === 'error').length;
  if (fallbackCount === sources.length) return 'Preview fallback';
  if (errorCount > 0) return 'Source errors';
  if (fallbackCount > 0) return 'Partial fallback';
  if (data.cache.status === 'cached') return 'Cached data';
  if (data.cache.status === 'stale') return 'Stale cache';
  return 'Live public data';
}

function cacheTone(data: CyberDashboardData) {
  const sources = Object.values(data.sourceStatus);
  if (sources.some(source => source.status === 'fallback' || source.status === 'error')) {
    return 'bg-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.75)]';
  }
  if (data.cache.status === 'stale') {
    return 'bg-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.75)]';
  }

  return 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]';
}

function sourceIcon(id: CyberSourceId) {
  if (id === 'CISA_KEV') return '▣';
  if (id === 'NVD') return '⌁';
  if (id === 'GITHUB_ADVISORY') return 'GH';
  return '◇';
}

function filterItems(items: ThreatItem[], severity: SeverityFilter, source: SourceFilter) {
  return items.filter(item => {
    const severityMatches = severity === 'ALL' || item.severity === severity;
    const sourceMatches = source === 'ALL' || item.source === source;
    return severityMatches && sourceMatches;
  });
}

function panelRowLimit(isExpanded: boolean, itemCount: number) {
  return isExpanded ? Math.max(itemCount, 5) : 5;
}

export default function CyberThreatPulse() {
  const [data, setData] = useState<CyberDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('ALL');
  const [expandedPanels, setExpandedPanels] = useState<Record<ExpandablePanel, boolean>>({
    exploited: false,
    epss: false,
    recent: false,
    supply: false,
  });

  useEffect(() => {
    fetch('/api/cyber-threats')
      .then(async res => {
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload.error || 'Cyber threat data temporarily unavailable.');
        }
        return payload;
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <CyberSkeleton />;
  if (error) {
    return (
      <div className="min-h-screen bg-[#050a14] p-6 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-400/25 bg-red-500/10 p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-red-200">Cyber Threat Pulse</p>
          <h1 className="mt-3 text-3xl font-semibold">Cyber threat data temporarily unavailable.</h1>
          <p className="mt-3 text-slate-300">{error}</p>
          <p className="mt-6 text-sm text-slate-400">The dashboard is designed to fall back to cached or preview data when upstream public APIs fail.</p>
        </div>
      </div>
    );
  }
  if (!data) return <div className="min-h-screen bg-[#050a14] p-6 text-slate-300">No cyber threat data available.</div>;

  const filteredExploited = filterItems(data.exploited, severityFilter, sourceFilter);
  const filteredRecentCves = filterItems(data.recentCves, severityFilter, sourceFilter);
  const filteredAdvisories = filterItems(data.advisories, severityFilter, sourceFilter);
  const filteredEpss = filterItems(data.epssLeaderboard, severityFilter, sourceFilter);
  const togglePanel = (panel: ExpandablePanel) => {
    setExpandedPanels(current => ({
      ...current,
      [panel]: !current[panel],
    }));
  };

  const renderViewToggle = (panel: ExpandablePanel, total: number) => {
    const isExpanded = expandedPanels[panel];
    const canExpand = total > 5;

    return (
      <button
        type="button"
        onClick={() => canExpand && togglePanel(panel)}
        disabled={!canExpand}
        className={`text-xs transition ${canExpand ? 'text-amber-300 hover:text-amber-100' : 'cursor-default text-slate-600'}`}
        aria-expanded={isExpanded}
      >
        {canExpand ? (isExpanded ? 'Show less' : `View all ${total}`) : `Top ${total}`}
      </button>
    );
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#030707] text-white">
      {/* Sidebar Navigation */}
      <SidebarNav />

      {/* Main Content */}
      <main className="relative mx-auto max-w-[1640px] p-3 md:ml-24 md:p-4">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(245,158,11,0.09),transparent_26%),radial-gradient(circle_at_85%_10%,rgba(250,204,21,0.07),transparent_30%),linear-gradient(120deg,rgba(251,191,36,0.035),transparent_45%)]" />
        <div className="relative">
        {/* Header Section */}
        <section className="panel relative mb-3 overflow-hidden rounded-lg border border-slate-700/70 bg-[#05090a]/95 p-0" id="overview">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/80 to-transparent" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] bg-[linear-gradient(90deg,#fbbf24_1px,transparent_1px)] bg-[size:64px_64px]" />
          <div className="relative grid grid-cols-1 lg:grid-cols-[76px_minmax(340px,1fr)_300px_420px]">
            <div className="flex items-center justify-center border-b border-slate-700/60 bg-black/25 p-3 lg:border-b-0 lg:border-r">
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/45 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.2),rgba(0,0,0,0.42))] text-amber-300 shadow-[0_0_24px_rgba(245,158,11,0.16)]">
                <div className="absolute inset-1 rounded-xl border border-amber-300/10" />
                <svg viewBox="0 0 48 48" className="h-10 w-10 drop-shadow-[0_0_10px_rgba(251,191,36,0.22)]" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M24 4 39 10v12c0 10-6 17-15 21C15 39 9 32 9 22V10L24 4Z" />
                  <path d="M16 25h5l3-9 4 17 3-8h5" />
                </svg>
              </div>
            </div>
            <div className="flex min-h-[5.75rem] flex-col justify-center border-b border-slate-700/60 px-4 py-3 lg:border-b-0 lg:border-r">
              <h1 className="text-[1.65rem] font-black uppercase leading-none tracking-[0.08em] text-amber-300 md:text-[2rem]">
                Cyber Threat Pulse
              </h1>
              <p className="mt-2 text-sm font-semibold text-white">
                Real-time Cyber Threat Intelligence
              </p>
            </div>
            <div className="flex min-h-[5.75rem] flex-col justify-center border-b border-slate-700/60 px-4 py-3 lg:border-b-0 lg:border-r">
              <p className="text-[0.66rem] font-bold uppercase tracking-[0.22em] text-slate-400">Last updated</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-white">
                <span>{formatTimestamp(data.generatedAt)}</span>
                <span className="inline-flex items-center gap-2 text-xs font-semibold">
                  <span className={`h-2 w-2 rounded-full ${cacheTone(data)}`} />
                  {cacheLabel(data)}
                </span>
              </div>
              <p className="mt-1.5 text-[0.66rem] uppercase tracking-[0.18em] text-slate-500">
                Cache {data.cache.status} / {data.cache.provider}
              </p>
            </div>
            <div className="flex min-h-[5.75rem] flex-col justify-center px-4 py-3">
              <p className="text-[0.66rem] font-bold uppercase tracking-[0.22em] text-slate-400">Data sources</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.values(data.sourceStatus).map(source => (
                  <span key={source.id} className={`inline-flex items-center gap-2 rounded border px-2.5 py-1.5 text-[0.68rem] font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${
                    source.status === 'live' ? 'border-amber-400/30 bg-amber-400/10 text-white' :
                    source.status === 'cached' ? 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100' :
                    'border-red-300/25 bg-red-300/10 text-red-100'
                  }`}>
                    <span className="font-mono text-amber-300">{sourceIcon(source.id)}</span>
                    {sourceShortLabels[source.id]}
                    <span className="text-[0.62rem] font-semibold text-slate-500">{source.itemCount}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="mb-3 overflow-hidden rounded-lg border border-amber-500/20 bg-[linear-gradient(90deg,rgba(251,191,36,0.08),rgba(0,0,0,0.26)_34%,rgba(15,23,42,0.18))]">
          <div className="grid gap-0 xl:grid-cols-[minmax(220px,0.9fr)_1.4fr_1.6fr_auto]">
            <div className="border-b border-amber-500/10 px-3 py-2.5 xl:border-b-0 xl:border-r">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-amber-300">Intelligence filters</p>
              <p className="mt-1 hidden text-xs leading-5 text-slate-400 md:block">Client-side controls for the visible command view.</p>
            </div>
            <div className="border-b border-amber-500/10 px-3 py-2.5 xl:border-b-0 xl:border-r">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[0.6rem] font-bold uppercase tracking-[0.22em] text-slate-500">Severity</span>
                <span className="text-[0.6rem] uppercase tracking-[0.18em] text-slate-600">{severityFilter}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {severityFilters.map(filter => (
                  <button
                    key={filter}
                    onClick={() => setSeverityFilter(filter)}
                    className={`rounded-md border px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.13em] transition ${
                      severityFilter === filter
                        ? 'border-amber-300/70 bg-amber-300/16 text-amber-100 shadow-[0_0_14px_rgba(245,158,11,0.12)]'
                        : 'border-slate-700/80 bg-slate-950/55 text-slate-500 hover:border-slate-500/80 hover:text-slate-200'
                    }`}
                    aria-pressed={severityFilter === filter}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-b border-amber-500/10 px-3 py-2.5 xl:border-b-0 xl:border-r">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[0.6rem] font-bold uppercase tracking-[0.22em] text-slate-500">Source</span>
                <span className="text-[0.6rem] uppercase tracking-[0.18em] text-slate-600">
                  {sourceFilter === 'ALL' ? 'All sources' : sourceShortLabels[sourceFilter]}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {sourceFilters.map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => setSourceFilter(filter.id)}
                    className={`rounded-md border px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.13em] transition ${
                      sourceFilter === filter.id
                        ? 'border-amber-300/60 bg-amber-300/16 text-amber-100 shadow-[0_0_14px_rgba(245,158,11,0.12)]'
                        : 'border-slate-700/80 bg-slate-950/55 text-slate-500 hover:border-slate-500/80 hover:text-slate-200'
                    }`}
                    aria-pressed={sourceFilter === filter.id}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 px-3 py-2.5 xl:min-w-48 xl:flex-col xl:items-start xl:justify-center">
              <span className="text-[0.6rem] font-bold uppercase tracking-[0.22em] text-slate-500">Mode</span>
              <span className="rounded border border-slate-700/70 bg-black/35 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-slate-300">
                {severityFilter === 'ALL' && sourceFilter === 'ALL' ? 'Full signal' : 'Filtered signal'}
              </span>
            </div>
          </div>
        </section>

        {/* Summary Cards */}
        <ThreatSummaryCards summary={data.summary} />

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_1fr] gap-3 mt-3">
          {/* Left Column: Threat Radar */}
          <div>
            <ThreatRadar data={data} />
          </div>

          {/* Right Column: Tables and Cards */}
          <div className="space-y-3">
            {/* Exploited in the Wild Table */}
            <div className="panel rounded-lg border border-amber-500/25 bg-[#070b0c] p-3" id="exploited">
              <div className="flex items-center justify-between gap-4 mb-3">
                <h2 className="text-base font-bold uppercase text-amber-300">Exploited in the Wild <span className="font-normal text-slate-400">(CISA KEV)</span></h2>
                {renderViewToggle('exploited', filteredExploited.length)}
              </div>
              <ThreatTable
                items={filteredExploited}
                columns={['cveId', 'vendor', 'severity', 'dateAddedToKev', 'dueDate', 'epssScore']}
                maxRows={panelRowLimit(expandedPanels.exploited, filteredExploited.length)}
                emptyLabel="No exploited vulnerabilities match the active filters."
              />
            </div>

            {/* EPSS Leaderboard Table */}
            <div className="panel rounded-lg border border-amber-500/25 bg-[#070b0c] p-3" id="exploit-risk">
              <div className="flex items-center justify-between gap-4 mb-3">
                <h2 className="text-base font-bold uppercase text-amber-300">Exploit Probability Leaderboard <span className="font-normal text-slate-400">(EPSS)</span></h2>
                {renderViewToggle('epss', filteredEpss.length)}
              </div>
              <ThreatTable
                items={filteredEpss}
                columns={['cveId', 'epssScore', 'severity', 'kev', 'source']}
                maxRows={panelRowLimit(expandedPanels.epss, filteredEpss.length)}
                emptyLabel="No EPSS-ranked items match the active filters."
              />
            </div>
          </div>
        </div>

        {/* Bottom Row: Three Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.35fr_1.15fr] gap-3 mt-3">
          {/* New Vulnerabilities */}
          <div className="panel rounded-lg border border-amber-500/25 bg-[#070b0c] p-3" id="vulnerabilities">
            <div className="flex items-center justify-between gap-4 mb-3">
              <h2 className="text-base font-bold uppercase text-amber-300">New Vulnerabilities <span className="font-normal text-slate-400">(NVD)</span></h2>
              {renderViewToggle('recent', filteredRecentCves.length)}
            </div>
            <ThreatTable
              items={filteredRecentCves}
              columns={['cveId', 'severity', 'datePublished', 'title']}
              maxRows={panelRowLimit(expandedPanels.recent, filteredRecentCves.length)}
              emptyLabel="No recent CVEs match the active filters."
            />
          </div>

          {/* Supply Chain Watch */}
          <div id="supply-chain">
            <div className="relative">
              <div className="absolute right-3 top-3 z-10">
                {renderViewToggle('supply', filteredAdvisories.length)}
              </div>
              <SupplyChainWatch
                items={filteredAdvisories}
                maxAdvisories={panelRowLimit(expandedPanels.supply, filteredAdvisories.length)}
              />
            </div>
          </div>

          {/* Threat Timeline */}
          <div id="timeline">
            <ThreatTimeline timeline={data.charts.timeline} />
          </div>
        </div>

        {/* Distribution Charts */}
        <section className="mt-3" aria-labelledby="secondary-analytics-heading">
          <div className="mb-2 flex items-center justify-between gap-4">
            <div>
              <h2 id="secondary-analytics-heading" className="text-sm font-bold uppercase tracking-[0.14em] text-amber-300">
                Secondary Analytics
              </h2>
              <p className="mt-1 text-xs text-slate-500">Distribution views for deeper context below the primary command module.</p>
            </div>
            <span className="hidden text-[0.65rem] uppercase tracking-[0.18em] text-slate-600 sm:inline">Below the fold</span>
          </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
          <SeverityChart severityDistribution={data.charts.severityDistribution} />
          <EcosystemChart ecosystemDistribution={data.charts.ecosystemDistribution} />
          <VendorChart vendorDistribution={data.charts.vendorDistribution} />
        </div>
        </section>

        {/* Footer */}
        <section className="panel mt-3 grid gap-4 rounded-lg border border-slate-700/70 bg-[#05090a] p-4 text-xs text-slate-400 lg:grid-cols-[1fr_1px_1fr_1px_auto]" id="about">
          <div>
            <p className="font-medium text-slate-300">Cyber Threat Pulse aggregates and visualizes public vulnerability intelligence from trusted sources.</p>
            <p className="mt-1">This dashboard does not represent live attacks or real-time intrusion data.</p>
          </div>
          <div className="hidden bg-slate-700/70 lg:block" />
          <div className="flex flex-wrap items-center gap-4">
            <span>Sources:</span>
            <span className="text-cyan-300">CISA KEV Catalog</span>
            <span className="text-cyan-300">NVD NIST</span>
            <span className="text-cyan-300">GitHub Advisories</span>
            <span className="text-cyan-300">FIRST EPSS</span>
          </div>
          <div className="hidden bg-slate-700/70 lg:block" />
          <p className="whitespace-nowrap">Data refreshed every 6 hours</p>
        </section>
        </div>
      </main>
    </div>
  );
}
