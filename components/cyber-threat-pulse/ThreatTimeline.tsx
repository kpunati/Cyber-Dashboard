'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ThreatTimelineProps {
  timeline: {
    date: string;
    count: number;
    cvePublished?: number;
    kevAdded?: number;
    ossAdvisories?: number;
  }[];
}

function formatShortDate(date: string) {
  const parsed = new Date(date);
  if (!Number.isFinite(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(parsed);
}

export default function ThreatTimeline({ timeline }: ThreatTimelineProps) {
  const hasSeriesData = timeline.some(point => (point.cvePublished ?? 0) > 0 || (point.kevAdded ?? 0) > 0 || (point.ossAdvisories ?? 0) > 0);

  return (
    <div className="panel flex h-full flex-col rounded-lg border border-amber-500/25 bg-[#070b0c] p-3">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div>
          <h2 className="text-base font-bold uppercase text-amber-300">Threat Timeline <span className="font-normal text-slate-400">(30 days)</span></h2>
          <p className="mt-1 text-xs text-slate-400">Daily NVD CVEs, KEV additions, and OSS advisories.</p>
        </div>
        <div className="hidden flex-wrap items-center justify-end gap-3 text-[0.65rem] uppercase tracking-[0.12em] text-slate-400 md:flex">
          <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-full bg-cyan-300" /> CVE</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-full bg-red-400" /> KEV</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-full bg-amber-300" /> OSS</span>
        </div>
      </div>
      <div className="min-h-60 flex-1">
        {hasSeriesData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeline} margin={{ top: 8, right: 18, left: -8, bottom: 0 }}>
              <CartesianGrid stroke="#3f3215" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                interval="preserveStartEnd"
                minTickGap={22}
                tickFormatter={formatShortDate}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis allowDecimals={false} width={34} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                labelFormatter={formatShortDate}
                wrapperStyle={{ outline: 'none' }}
                contentStyle={{ backgroundColor: '#0b1112', border: '1px solid rgba(245,158,11,0.35)', borderRadius: '0.5rem', color: '#fff' }}
              />
              <Line name="CVE Published" type="monotone" dataKey="cvePublished" stroke="#38d5d7" strokeWidth={2.4} dot={{ r: 2, fill: '#38d5d7' }} activeDot={{ r: 4 }} />
              <Line name="KEV Added" type="monotone" dataKey="kevAdded" stroke="#ef4444" strokeWidth={2.4} dot={{ r: 2, fill: '#ef4444' }} activeDot={{ r: 4 }} />
              <Line name="OSS Advisories" type="monotone" dataKey="ossAdvisories" stroke="#fbbf24" strokeWidth={2.8} dot={{ r: 2, fill: '#fbbf24' }} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded border border-dashed border-amber-500/20 bg-black/30 px-4 text-center text-sm text-slate-400">
            Timeline data is temporarily unavailable for the active source window.
          </div>
        )}
      </div>
    </div>
  );
}
