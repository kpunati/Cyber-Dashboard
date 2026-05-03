'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface VendorChartProps {
  vendorDistribution: Record<string, number>;
}

export default function VendorChart({ vendorDistribution }: VendorChartProps) {
  const data = Object.entries(vendorDistribution)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([vendor, count]) => ({
      name: vendor.length > 15 ? vendor.substring(0, 15) + '...' : vendor,
      fullName: vendor,
      value: count
    }));

  return (
    <div className="panel rounded-lg border border-amber-500/20 bg-[#070b0c] p-4">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-base font-bold uppercase text-amber-300">Top Vendors</h2>
          <p className="mt-1 text-sm text-slate-400">Vendors with the most tracked CVEs.</p>
        </div>
        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Top 10</span>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
            layout="horizontal"
          >
            <CartesianGrid stroke="#3f3215" strokeDasharray="3 3" />
            <XAxis
              type="number"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={100}
            />
            <Tooltip
              wrapperStyle={{ backgroundColor: '#111827', border: '1px solid #334155' }}
              contentStyle={{ borderRadius: '0.75rem', color: '#fff' }}
              formatter={(value, name, props) => [value, props.payload.fullName]}
            />
            <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
