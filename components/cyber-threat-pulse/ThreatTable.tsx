'use client';

import { ThreatItem } from '@/lib/cyber/types';
import SeverityBadge from './SeverityBadge';

interface ThreatTableProps {
  items: ThreatItem[];
  columns: ('cveId' | 'title' | 'vendor' | 'severity' | 'datePublished' | 'dateAddedToKev' | 'dueDate' | 'epssScore' | 'ecosystem' | 'source' | 'kev')[];
  maxRows?: number;
  emptyLabel?: string;
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
  cveId: 'min-w-[8rem] w-[8.5rem]',
  title: 'min-w-[14rem]',
  vendor: 'min-w-[14rem]',
  severity: 'min-w-[7rem] text-center',
  datePublished: 'min-w-[6rem]',
  dateAddedToKev: 'min-w-[6rem]',
  dueDate: 'min-w-[6rem]',
  epssScore: 'min-w-[8rem]',
  ecosystem: 'min-w-[7rem]',
  source: 'min-w-[6rem]',
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

export default function ThreatTable({ items, columns, maxRows = 5, emptyLabel = 'No matching threat signals.' }: ThreatTableProps) {
  const displayItems = items.slice(0, maxRows);

  const getCellValue = (item: ThreatItem, col: string): React.ReactNode => {
    switch (col) {
      case 'cveId':
        return <span className="font-mono text-[0.78rem] font-semibold leading-5 text-slate-100">{item.cveId || item.id}</span>;
      case 'title':
        {
          const text = summarizeThreatText(item.description || item.title);
          return <span className="line-clamp-2 break-words text-[0.78rem] font-medium leading-5 text-slate-300" title={item.description || item.title}>{text}</span>;
        }
      case 'vendor':
        return (
          <span className="line-clamp-2 text-[0.78rem] font-medium leading-5 text-slate-200">
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
              <span className="text-[0.56rem] uppercase tracking-[0.1em] text-slate-600">Unavailable</span>
            ) : null}
          </div>
        );
      case 'datePublished':
        return <span className="text-[0.74rem] text-slate-300">{formatDate(item.datePublished)}</span>;
      case 'dateAddedToKev':
        return <span className="text-[0.74rem] text-slate-300">{formatDate(item.dateAddedToKev)}</span>;
      case 'dueDate':
        return <span className="text-[0.74rem] text-slate-300">{formatDate(item.dueDate)}</span>;
      case 'epssScore':
        if (item.epssScore === undefined) return <span className="font-mono text-sm text-slate-600">—</span>;
        return (
          <div className="min-w-28">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold text-orange-200">{Math.round(item.epssScore * 100)}%</span>
              <span className="rounded-sm bg-slate-800/80 px-1.5 py-0.5 text-[0.62rem] font-semibold text-slate-400">
                {formatPercentile(item.epssPercentile) ?? 'pct —'}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800/80">
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
        return <span className="rounded border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-xs text-amber-100">{item.ecosystem || '—'}</span>;
      case 'source':
        return <span className="text-xs uppercase tracking-[0.12em] text-slate-400">{sourceLabels[item.source] || item.source}</span>;
      case 'kev':
        return (
          <span className={`inline-flex min-w-12 items-center justify-center rounded-sm border px-2 py-1 text-[0.66rem] font-bold uppercase tracking-[0.12em] ${
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
      <div className="rounded border border-dashed border-amber-500/20 bg-black/30 px-4 py-8 text-center text-sm text-slate-400">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-amber-500/20 bg-black/20">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-amber-500/25 bg-[#171407]">
            {columns.map((col) => (
              <th
                key={col}
                className={`whitespace-nowrap px-3 py-2 text-left text-[0.66rem] font-black uppercase tracking-[0.18em] text-amber-300 ${columnClasses[col] ?? ''}`}
              >
                {columnLabels[col] || col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayItems.map((item, idx) => (
            <tr key={`${item.id}-${idx}`} className="border-b border-amber-500/10 transition-colors last:border-0 hover:bg-amber-300/[0.045]">
              {columns.map((col) => (
                <td key={`${item.id}-${col}`} className={`px-3 py-2.5 align-middle ${col === 'severity' ? 'text-center' : ''}`}>
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
