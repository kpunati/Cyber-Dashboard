'use client';

import { ThreatItem } from '@/lib/cyber/types';
import SeverityBadge from './SeverityBadge';

interface ThreatTableProps {
  items: ThreatItem[];
  columns: ('cveId' | 'title' | 'vendor' | 'severity' | 'datePublished' | 'dateAddedToKev' | 'dueDate' | 'epssScore' | 'ecosystem' | 'source')[];
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
};

const sourceLabels: Record<string, string> = {
  CISA_KEV: 'CISA',
  NVD: 'NVD',
  GITHUB_ADVISORY: 'GHSA',
  EPSS: 'EPSS',
};

function formatDate(date?: string) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(date));
}

function formatPercentile(percentile?: number) {
  if (percentile === undefined) return null;
  return `${Math.round(percentile * 100)}th pct`;
}

export default function ThreatTable({ items, columns, maxRows = 5, emptyLabel = 'No matching threat signals.' }: ThreatTableProps) {
  const displayItems = items.slice(0, maxRows);

  const getCellValue = (item: ThreatItem, col: string): React.ReactNode => {
    switch (col) {
      case 'cveId':
        return <span className="font-mono text-[0.78rem] font-medium text-slate-200">{item.cveId || item.id}</span>;
      case 'title':
        return <span className="line-clamp-2 text-[0.78rem] leading-5 text-slate-300">{item.description || item.title}</span>;
      case 'vendor':
        return (
          <span className="text-[0.78rem] text-slate-200">
            {item.vendor ? `${item.vendor}${item.product ? ` / ${item.product}` : ''}` : item.packageName || '—'}
          </span>
        );
      case 'severity':
        return <SeverityBadge severity={item.severity || 'UNKNOWN'} />;
      case 'datePublished':
        return <span className="text-[0.74rem] text-slate-300">{formatDate(item.datePublished)}</span>;
      case 'dateAddedToKev':
        return <span className="text-[0.74rem] text-slate-300">{formatDate(item.dateAddedToKev)}</span>;
      case 'dueDate':
        return <span className="text-[0.74rem] text-slate-300">{formatDate(item.dueDate)}</span>;
      case 'epssScore':
        if (item.epssScore === undefined) return <span className="text-slate-500">—</span>;
        return (
          <div className="min-w-28">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-semibold text-orange-200">{Math.round(item.epssScore * 100)}%</span>
              <span className="text-[0.65rem] text-slate-500">{formatPercentile(item.epssPercentile)}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-red-400"
                style={{ width: `${Math.min(item.epssScore * 100, 100)}%` }}
              />
            </div>
          </div>
        );
      case 'ecosystem':
        return <span className="rounded border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-xs text-amber-100">{item.ecosystem || '—'}</span>;
      case 'source':
        return <span className="text-xs uppercase tracking-[0.12em] text-slate-400">{sourceLabels[item.source] || item.source}</span>;
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
    <div className="overflow-x-auto rounded border border-amber-500/20">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-amber-500/25 bg-amber-400/10">
            {columns.map((col) => (
              <th
                key={col}
                className="whitespace-nowrap px-3 py-2 text-left text-[0.66rem] font-bold uppercase tracking-[0.12em] text-amber-300"
              >
                {columnLabels[col] || col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayItems.map((item, idx) => (
            <tr key={`${item.id}-${idx}`} className="border-b border-amber-500/10 last:border-0 hover:bg-amber-300/[0.04] transition-colors">
              {columns.map((col) => (
                <td key={`${item.id}-${col}`} className="px-3 py-2.5 align-middle">
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
