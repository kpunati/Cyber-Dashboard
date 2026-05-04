'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ThreatTimelineProps {
  timeline: { date: string; count: number }[];
}

function formatShortDate(date: string) {
  const parsed = new Date(date);
  if (!Number.isFinite(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(parsed);
}

export default function ThreatTimeline({ timeline }: ThreatTimelineProps) {
  return (
    <div className="panel rounded-lg border border-amber-500/25 bg-[#070b0c] p-3">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div>
          <h2 className="text-base font-bold uppercase text-amber-300">Threat Timeline <span className="font-normal text-slate-400">(30 days)</span></h2>
          <p className="mt-1 text-xs text-slate-400">CVE volume over the last 30 days.</p>
        </div>
      </div>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={timeline} margin={{ top: 5, right: 14, left: -8, bottom: 0 }}>
            <CartesianGrid stroke="#3f3215" strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis width={34} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip wrapperStyle={{ backgroundColor: '#0b1112', border: '1px solid rgba(245,158,11,0.35)' }} contentStyle={{ borderRadius: '0.5rem', color: '#fff' }} />
            <Line type="monotone" dataKey="count" stroke="#fbbf24" strokeWidth={3} dot={{ r: 2, fill: '#fbbf24' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
