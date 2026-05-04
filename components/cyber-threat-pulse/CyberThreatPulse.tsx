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
  if (fallbackCount === sources.length) return 'Preview fallback';
  if (fallbackCount > 0) return 'Partial fallback';
  if (data.cache.status === 'cached') return 'Cached data';
  if (data.cache.status === 'stale') return 'Stale cache';
  return 'Live public data';
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
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
          <div className="grid grid-cols-1 lg:grid-cols-[88px_1fr_330px_410px]">
            <div className="flex items-center justify-center border-b border-slate-700/60 bg-black/20 p-3 lg:border-b-0 lg:border-r">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-amber-400/40 bg-amber-400/10 text-amber-300 shadow-lg shadow-amber-500/10">
                <svg viewBox="0 0 48 48" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M24 4 39 10v12c0 10-6 17-15 21C15 39 9 32 9 22V10L24 4Z" />
                  <path d="M16 25h5l3-9 4 17 3-8h5" />
                </svg>
              </div>
            </div>
            <div className="flex flex-col justify-center border-b border-slate-700/60 p-4 lg:border-b-0 lg:border-r">
              <h1 className="text-2xl font-black uppercase tracking-[0.08em] text-amber-300 md:text-[1.7rem]">Cyber Threat Pulse</h1>
              <p className="mt-1 text-sm font-medium text-white">
                Real-time Cyber Threat Intelligence
              </p>
            </div>
            <div className="flex flex-col justify-center border-b border-slate-700/60 p-4 lg:border-b-0 lg:border-r">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-slate-400">Last updated</p>
              <div className="mt-2 flex items-center gap-3 text-sm text-white">
                <span>{formatTimestamp(data.generatedAt)}</span>
                <span className="inline-flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                  {cacheLabel(data)}
                </span>
              </div>
              <p className="mt-1 text-[0.68rem] uppercase tracking-[0.12em] text-slate-500">Cache {data.cache.status} / {data.cache.provider}</p>
            </div>
            <div className="flex flex-col justify-center p-4">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-slate-400">Data sources</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.values(data.sourceStatus).map(source => (
                  <span key={source.id} className={`inline-flex items-center gap-2 rounded border px-2.5 py-1.5 text-[0.68rem] font-bold ${
                    source.status === 'live' ? 'border-amber-400/30 bg-amber-400/10 text-white' :
                    source.status === 'cached' ? 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100' :
                    'border-red-300/25 bg-red-300/10 text-red-100'
                  }`}>
                    <span className="font-mono text-amber-300">{sourceIcon(source.id)}</span>
                    {sourceShortLabels[source.id]}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="mb-3 rounded-lg border border-amber-500/20 bg-black/30 p-2.5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-300">Intelligence filters</p>
              <p className="mt-1 hidden text-xs text-slate-400 md:block">Filters apply to visible lists and keep all processing client-side.</p>
            </div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex flex-wrap gap-2">
                {severityFilters.map(filter => (
                  <button
                    key={filter}
                    onClick={() => setSeverityFilter(filter)}
                    className={`rounded border px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] transition ${
                      severityFilter === filter ? 'border-amber-300/60 bg-amber-300/15 text-amber-100' : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {sourceFilters.map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => setSourceFilter(filter.id)}
                    className={`rounded border px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] transition ${
                      sourceFilter === filter.id ? 'border-amber-300/50 bg-amber-300/15 text-amber-100' : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
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
                columns={['cveId', 'epssScore', 'severity', 'source']}
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
