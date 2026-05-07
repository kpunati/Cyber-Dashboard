'use client';

interface VendorChartProps {
  vendorDistribution: Record<string, number>;
}

function formatVendorName(vendor: string) {
  return vendor.length > 18 ? `${vendor.slice(0, 18)}...` : vendor;
}

export default function VendorChart({ vendorDistribution }: VendorChartProps) {
  const data = Object.entries(vendorDistribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([vendor, count]) => ({
      vendor,
      count,
      displayValue: Math.log10(count + 1),
    }));
  const maxDisplayValue = Math.max(...data.map(item => item.displayValue), 1);

  return (
    <div className="panel relative overflow-hidden rounded-lg border border-amber-500/20 bg-[#070b0c] p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(251,191,36,0.11),transparent_28%),linear-gradient(135deg,rgba(251,191,36,0.05),transparent_42%)]" />
      <div className="relative mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold uppercase tracking-[0.02em] text-amber-300">Top Vendors</h2>
          <p className="mt-1 text-sm text-slate-400">Vendors with the most tracked CVEs.</p>
        </div>
        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Top 10 / scaled</span>
      </div>

      {data.length === 0 ? (
        <div className="relative flex h-72 items-center justify-center rounded border border-dashed border-amber-500/20 bg-black/30 px-4 text-center text-sm text-slate-400">
          Vendor data is unavailable for the active source window.
        </div>
      ) : (
        <div className="relative h-72 space-y-2.5">
          {data.map((item, index) => {
            const width = Math.max((item.displayValue / maxDisplayValue) * 100, 8);
            return (
              <div key={item.vendor} className="grid grid-cols-[6.5rem_1fr_3rem] items-center gap-3">
                <span className="truncate text-right text-xs text-slate-400" title={item.vendor}>
                  {formatVendorName(item.vendor)}
                </span>
                <div className="relative h-5 overflow-hidden rounded-sm border border-amber-500/15 bg-black/45">
                  <div className="absolute inset-y-0 left-0 bg-[linear-gradient(90deg,#7c2d12,#f59e0b_48%,#fde68a)] shadow-[0_0_18px_rgba(245,158,11,0.32)]" style={{ width: `${width}%` }} />
                  <div className="absolute inset-0 opacity-35 bg-[linear-gradient(90deg,transparent_0,rgba(255,255,255,0.22)_50%,transparent_100%)] vendor-bar-scan" style={{ animationDelay: `${index * 90}ms` }} />
                </div>
                <span className="font-mono text-xs font-semibold text-amber-100">{item.count}</span>
              </div>
            );
          })}
          <p className="pt-1 text-[0.64rem] leading-4 text-slate-500">
            Bar length is scaled to keep major vendors visible without flattening smaller counts.
          </p>
        </div>
      )}
    </div>
  );
}
