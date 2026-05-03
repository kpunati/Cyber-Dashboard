'use client';

import { ThreatItem } from '@/lib/cyber/types';
import ThreatTable from './ThreatTable';

interface RecentCveStreamProps {
  items: ThreatItem[];
}

export default function RecentCveStream({ items }: RecentCveStreamProps) {
  return (
    <div className="panel cve-stream bg-[#0b1220] border border-[#1f2b45] rounded-3xl p-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">New Vulnerability Stream</h2>
          <p className="text-sm text-slate-400">Recent CVEs from NVD with severity and publish date.</p>
        </div>
        <span className="text-xs uppercase tracking-[0.3em] text-slate-500">NVD</span>
      </div>
      <ThreatTable
        items={items}
        columns={['cveId', 'severity', 'datePublished', 'title']}
        maxRows={6}
        emptyLabel="No recent CVEs match the active filters."
      />
    </div>
  );
}
