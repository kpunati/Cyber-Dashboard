'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface EcosystemChartProps {
  ecosystemDistribution: Record<string, number>;
}

const COLORS = {
  npm: '#cb3837',
  pip: '#3776ab',
  composer: '#885630',
  go: '#00add8',
  nuget: '#004880',
  rust: '#000000',
  maven: '#c71a36',
  rubygems: '#cc342d'
};

export default function EcosystemChart({ ecosystemDistribution }: EcosystemChartProps) {
  const data = Object.entries(ecosystemDistribution)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 8)
    .map(([ecosystem, count]) => ({
      name: ecosystem.toUpperCase(),
      value: count,
      color: COLORS[ecosystem as keyof typeof COLORS] || '#64748b'
    }));

  return (
    <div className="panel rounded-lg border border-amber-500/20 bg-[#070b0c] p-4">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-base font-bold uppercase tracking-[0.02em] text-amber-300">Ecosystem Distribution</h2>
          <p className="mt-1 text-sm text-slate-400">Vulnerabilities by package ecosystem.</p>
        </div>
        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Top 8</span>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: -8, bottom: 0 }}>
            <CartesianGrid stroke="#3f3215" strokeDasharray="4 4" opacity={0.75} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              width={34}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(251,191,36,0.05)' }}
              wrapperStyle={{ outline: 'none' }}
              contentStyle={{ backgroundColor: '#0b1112', border: '1px solid rgba(245,158,11,0.35)', borderRadius: '0.6rem', color: '#fff' }}
            />
            <Bar dataKey="value" fill="#fbbf24" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
