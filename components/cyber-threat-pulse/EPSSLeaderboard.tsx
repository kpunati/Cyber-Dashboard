'use client';

import { ThreatItem } from '@/lib/cyber/types';
import ThreatTable from './ThreatTable';

interface EPSSLeaderboardProps {
  items: ThreatItem[];
}

export default function EPSSLeaderboard({ items }: EPSSLeaderboardProps) {
  return (
    <div className="panel epss-leaderboard bg-[#0b1220] border border-[#1f2b45] rounded-3xl p-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Exploit Probability Leaderboard</h2>
          <p className="text-sm text-slate-400">Ranked by EPSS score and severity.</p>
        </div>
        <span className="text-xs uppercase tracking-[0.3em] text-slate-500">EPSS</span>
      </div>
      <ThreatTable
        items={items}
        columns={['cveId', 'epssScore', 'severity', 'source']}
        maxRows={6}
        emptyLabel="No EPSS-ranked items match the active filters."
      />
    </div>
  );
}
