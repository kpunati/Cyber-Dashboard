'use client';

import { ThreatItem } from '@/lib/cyber/types';
import SeverityBadge from './SeverityBadge';

interface ThreatTableProps {
  items: ThreatItem[];
  columns: ('cveId' | 'title' | 'vendor' | 'severity' | 'datePublished' | 'dateAddedToKev' | 'dueDate' | 'epssScore' | 'ecosystem' | 'source' | 'kev')[];
  maxRows?: number;
  emptyLabel?: string;
  maxHeightClass?: string;
}

const columnLabels: Record<string, string> = {
  cveId: 'CVE ID',
  title: 'DESCRIPTION',
  vendor: 'VENDOR / PRODUCT',
  severity: 'SEVERITY',
  datePublished: 'PUBLISHED',
  dateAddedToKev: 'ADDED',
  dueDate: 'DUE DATE',
  epssScore: 'EPSS',
  ecosystem: 'ECOSYSTEM',
  source: 'SOURCE',
  kev: 'KEV',
};

const sourceLabels: Record<string, string> = {
  CISA_KEV: 'CISA',
  NVD: 'NVD',
  GITHUB_ADVISORY: 'GHSA',
  EPSS: 'EPSS',
  NVD_TARGETED: 'NVD',
  EPSS_TARGETED: 'EPSS',
  CISA_VULNRICHMENT: 'CISA',
  CVE_PROJECT: 'CVE',
  OSV: 'OSV',
  VULNCHECK: 'VulnCheck',
};

const columnClasses: Record<string, string> = {
  cveId: 'min-w-[7.25rem] w-[7.75rem]',
  title: 'min-w-[13rem]',
  vendor: 'min-w-[13rem]',
  severity: 'min-w-[7rem] text-center',
  datePublished: 'min-w-[5.5rem]',
  dateAddedToKev: 'min-w-[5.5rem]',
  dueDate: 'min-w-[5.5rem]',
  epssScore: 'min-w-[8rem]',
  ecosystem: 'min-w-[6.5rem]',
  source: 'min-w-[5.5rem]',
  kev: 'min-w-[5rem] text-center',
};

function formatDate(date?: string) {
  if (!date) return '—';
  const parsed = new Date(date);
  if (!Number.isFinite(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(parsed);
}

function formatPercentile(percentile?: number) {
  if (percentile === undefined) return null;
  return `${Math.round(percentile * 100)}th pct`;
}

function getEpssBarWidth(score: number) {
  if (score <= 0) return '0%';
  return `${Math.min(Math.max(score * 100, 2.5), 100)}%`;
}

function summarizeThreatText(text?: string) {
  if (!text) return '—';
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 132) return normalized;

  const sentenceEnd = normalized.slice(0, 132).search(/[.!?](?=\s|$)/);
  if (sentenceEnd > 72) {
    return `${normalized.slice(0, sentenceEnd + 1)}`;
  }

  return `${normalized.slice(0, 129).trimEnd()}...`;
}

export default function ThreatTable({ items, columns, maxRows = 5, emptyLabel = 'No matching threat signals.', maxHeightClass }: ThreatTableProps) {
  const displayItems = items.slice(0, maxRows);

  const getCellValue = (item: ThreatItem, col: string): React.ReactNode => {
    switch (col) {
      case 'cveId':
        return <span className="font-mono text-[0.76rem] font-black leading-5 tracking-[-0.01em] text-slate-50">{item.cveId || item.id}</span>;
      case 'title':
        {
          const text = summarizeThreatText(item.description || item.title);
          return <span className="line-clamp-2 break-words text-[0.76rem] font-semibold leading-5 text-slate-300" title={item.description || item.title}>{text}</span>;
        }
      case 'vendor':
        return (
          <span className="line-clamp-2 text-[0.76rem] font-semibold leading-5 text-slate-200">
            {item.vendor ? `${item.vendor}${item.product ? ` / ${item.product}` : ''}` : item.packageName || '—'}
          </span>
        );
      case 'severity':
        return (
          <div className="flex flex-col items-center gap-1">
            <SeverityBadge severity={item.severity || 'UNKNOWN'} />
            {item.severity && item.severity !== 'UNKNOWN' && item.severitySource ? (
              <span className="text-[0.58rem] uppercase tracking-[0.12em] text-slate-500">{sourceLabels[item.severitySource] || item.severitySource}</span>
            ) : item.severity === 'UNKNOWN' ? (
              <span className="text-[0.54rem] uppercase tracking-[0.14em] text-slate-600">No public score</span>
            ) : null}
          </div>
        );
      case 'datePublished':
        return <span className="font-mono text-[0.72rem] text-slate-300">{formatDate(item.datePublished)}</span>;
      case 'dateAddedToKev':
        return <span className="font-mono text-[0.72rem] text-slate-300">{formatDate(item.dateAddedToKev)}</span>;
      case 'dueDate':
        return <span className="font-mono text-[0.72rem] text-slate-300">{formatDate(item.dueDate)}</span>;
      case 'epssScore':
        if (item.epssScore === undefined) return <span className="font-mono text-sm text-slate-600">--</span>;
        return (
          <div className="min-w-28">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-black text-orange-100">{Math.round(item.epssScore * 100)}%</span>
              <span className="rounded-[0.2rem] border border-slate-600/30 bg-slate-900/85 px-1.5 py-0.5 font-mono text-[0.58rem] font-bold text-slate-400">
                {formatPercentile(item.epssPercentile) ?? 'pct —'}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full border border-slate-700/25 bg-slate-900/90">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-300 via-orange-400 to-red-400 shadow-[0_0_10px_rgba(248,113,113,0.45)]"
                style={{ width: getEpssBarWidth(item.epssScore) }}
              />
            </div>
            {item.epssSource ? (
              <p className="mt-1 text-[0.56rem] uppercase tracking-[0.12em] text-slate-600">{sourceLabels[item.epssSource] || item.epssSource}</p>
            ) : null}
          </div>
        );
      case 'ecosystem':
        return <span className="rounded-[0.22rem] border border-amber-400/25 bg-amber-400/10 px-2 py-1 font-mono text-[0.68rem] font-bold uppercase tracking-[0.08em] text-amber-100">{item.ecosystem || '—'}</span>;
      case 'source':
        return <span className="font-mono text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-400">{sourceLabels[item.source] || item.source}</span>;
      case 'kev':
        return (
          <span className={`inline-flex min-w-12 items-center justify-center rounded-[0.22rem] border px-2 py-1 font-mono text-[0.64rem] font-black uppercase tracking-[0.14em] ${
            item.isKnownExploited
              ? 'border-red-400/35 bg-red-500/10 text-red-300'
              : 'border-slate-600/40 bg-slate-900/35 text-slate-500'
          }`}>
            {item.isKnownExploited ? 'Yes' : 'No'}
          </span>
        );
      default:
        return '—';
    }
  };

  if (displayItems.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-amber-500/25 bg-black/35 px-4 py-8 text-center text-sm font-medium text-slate-400">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className={`rounded-md border border-amber-500/20 bg-[#050808]/70 shadow-[inset_0_1px_0_rgba(250,204,21,0.05)] ${maxHeightClass ? `${maxHeightClass} overflow-auto` : 'overflow-x-auto'}`}>
      <table className="w-full border-collapse text-sm">
        <thead className={maxHeightClass ? 'sticky top-0 z-10' : undefined}>
          <tr className="border-b border-amber-500/35 bg-gradient-to-r from-[#1b1608] via-[#161207] to-[#0c0d09] shadow-[inset_0_1px_0_rgba(250,204,21,0.08)]">
            {columns.map((col) => (
              <th
                key={col}
                className={`whitespace-nowrap px-3 py-2 text-left font-mono text-[0.63rem] font-black uppercase tracking-[0.22em] text-amber-200 ${columnClasses[col] ?? ''}`}
              >
                {columnLabels[col] || col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayItems.map((item, idx) => (
            <tr
              key={`${item.id}-${idx}`}
              className="border-b border-amber-500/10 bg-black/[0.08] transition-colors last:border-0 odd:bg-white/[0.012] hover:bg-amber-300/[0.055]"
            >
              {columns.map((col) => (
                <td key={`${item.id}-${col}`} className={`px-3 py-2 align-middle ${col === 'severity' ? 'text-center' : ''}`}>
                  {getCellValue(item, col)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
