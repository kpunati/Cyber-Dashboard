'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface SeverityChartProps {
  severityDistribution: Record<string, number>;
}

const COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  LOW: '#22c55e',
  MEDIUM: '#eab308',
  UNKNOWN: '#64748b'
};

export default function SeverityChart({ severityDistribution }: SeverityChartProps) {
  const data = Object.entries(severityDistribution).map(([severity, count]) => ({
    name: severity.toUpperCase(),
    value: count,
    color: COLORS[severity as keyof typeof COLORS] || '#64748b'
  }));

  return (
    <div className="panel rounded-lg border border-amber-500/20 bg-[#070b0c] p-4">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-base font-bold uppercase text-amber-300">Severity Distribution</h2>
          <p className="mt-1 text-sm text-slate-400">CVEs by severity level.</p>
        </div>
        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">All sources</span>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              wrapperStyle={{ backgroundColor: '#111827', border: '1px solid #334155' }}
              contentStyle={{ borderRadius: '0.75rem', color: '#fff' }}
            />
            <Legend
              wrapperStyle={{ color: '#94a3b8' }}
              formatter={(value) => <span style={{ color: '#94a3b8' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
