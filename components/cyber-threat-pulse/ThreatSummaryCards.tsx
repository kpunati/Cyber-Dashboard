'use client';

import { CyberDashboardData } from '@/lib/cyber/types';

interface ThreatSummaryCardsProps {
  summary: CyberDashboardData['summary'];
}

export default function ThreatSummaryCards({ summary }: ThreatSummaryCardsProps) {
  const cards = [
    {
      label: 'Known Exploited',
      value: summary.knownExploitedCount,
      note: `+${summary.trends?.knownExploitedLast7Days ?? 0} in last 7 days`,
      accent: 'border-red-500/60 from-red-500/25 to-[#100807]',
      icon: 'biohazard',
      tone: 'text-red-300',
      info: 'Known exploited means attackers have already used these security flaws in the real world.',
    },
    {
      label: 'Critical CVEs',
      value: summary.criticalCount,
      note: `+${summary.trends?.criticalLast7Days ?? 0} in last 7 days`,
      accent: 'border-amber-400/60 from-amber-400/20 to-[#100c03]',
      icon: 'shield',
      tone: 'text-amber-200',
      info: 'Critical CVEs are the most serious reported software flaws and should usually be fixed first.',
    },
    {
      label: 'High EPSS',
      value: summary.highEpssCount,
      note: `+${summary.trends?.highEpssLast7Days ?? 0} in last 7 days`,
      accent: 'border-cyan-400/50 from-cyan-400/20 to-[#031013]',
      icon: 'target',
      tone: 'text-cyan-200',
      info: 'High EPSS means a flaw is more likely to be exploited soon based on public threat signals.',
    },
    {
      label: 'OSS Advisories',
      value: summary.openSourceAdvisoryCount,
      note: `+${summary.trends?.openSourceAdvisoriesLast7Days ?? 0} in last 7 days`,
      accent: 'border-amber-400/50 from-yellow-400/18 to-[#100c03]',
      icon: 'cube',
      tone: 'text-amber-200',
      info: 'OSS advisories are security warnings for open-source software packages used by developers.',
    },
    {
      label: 'Top Ecosystem',
      value: summary.topEcosystem || 'N/A',
      note: `${summary.trends?.topEcosystemAdvisories ?? 0} advisories`,
      accent: 'border-amber-400/50 from-amber-400/16 to-[#100c03]',
      icon: 'code',
      tone: 'text-amber-200',
      info: 'Top ecosystem shows which package community, like npm or pip, has the most tracked advisories here.',
    },
    {
      label: 'Top Vendor',
      value: summary.topVendor || 'N/A',
      note: `${summary.trends?.topVendorCves ?? 0} CVEs`,
      accent: 'border-amber-400/50 from-yellow-400/18 to-[#100c03]',
      icon: 'city',
      tone: 'text-amber-200',
      info: 'Top vendor shows the company or project with the most tracked CVEs in this dashboard.',
    },
  ];

  const renderIcon = (icon: string, tone: string) => {
    const common = `h-12 w-12 ${tone}`;
    if (icon === 'biohazard') {
      return (
        <svg viewBox="0 0 48 48" className={common} fill="none" stroke="currentColor" strokeWidth="2.4">
          <circle cx="24" cy="24" r="5" />
          <path d="M24 19c-7-8-3-14 3-14 3 0 6 2 7 5M20 27c-10 2-14-4-11-9 2-3 5-5 9-4M28 27c10 2 14-4 11-9-2-3-5-5-9-4M16 33c4 6 12 8 16 0M24 29v11" />
        </svg>
      );
    }
    if (icon === 'shield') {
      return (
        <svg viewBox="0 0 48 48" className={common} fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M24 5 39 11v12c0 10-6 16-15 20C15 39 9 33 9 23V11L24 5Z" />
          <path d="M24 15v18M16 24h16" />
        </svg>
      );
    }
    if (icon === 'target') {
      return (
        <svg viewBox="0 0 48 48" className={common} fill="none" stroke="currentColor" strokeWidth="2.2">
          <circle cx="24" cy="24" r="16" />
          <circle cx="24" cy="24" r="8" />
          <path d="M24 3v8M24 37v8M3 24h8M37 24h8" />
        </svg>
      );
    }
    if (icon === 'cube') {
      return (
        <svg viewBox="0 0 48 48" className={common} fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="m24 5 16 9v20l-16 9-16-9V14L24 5Z" />
          <path d="M8 14l16 9 16-9M24 23v20M16 10l16 9" />
        </svg>
      );
    }
    if (icon === 'code') {
      return (
        <svg viewBox="0 0 48 48" className={common} fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="m18 15-9 9 9 9M30 15l9 9-9 9" />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 48 48" className={common} fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M8 40h32M12 40V21h8v19M20 40V12h8v28M28 40V26h8v14" />
      </svg>
    );
  };

  const getTooltipPlacement = (index: number) => {
    if (index % 3 === 0) {
      return 'right-0 sm:left-0 sm:right-auto';
    }

    if (index % 3 === 1) {
      return 'right-0 xl:left-1/2 xl:right-auto xl:-translate-x-1/2';
    }

    return 'right-0';
  };

  return (
    <div className="summary-cards grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {cards.map((card, index) => (
        <div
          key={card.label}
          className={`panel group relative min-h-[7.25rem] overflow-visible rounded-xl border bg-[#0b0f0f] p-3 shadow-[0_0_0_1px_rgba(251,191,36,0.03),0_20px_48px_rgba(0,0,0,0.38)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(245,158,11,0.16),0_24px_54px_rgba(0,0,0,0.45)] ${card.accent}`}
        >
          <div className="group/info absolute right-2 top-2 z-40">
            <button
              type="button"
              className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-500/50 bg-black/65 text-[0.68rem] font-bold text-slate-300 outline-none ring-offset-2 ring-offset-black transition hover:border-amber-300/70 hover:bg-amber-300/10 hover:text-amber-200 focus:border-amber-300/80 focus:text-amber-100 focus:ring-2 focus:ring-amber-300/30"
              aria-label={`What does ${card.label} mean?`}
              aria-describedby={`${card.label.replace(/\s+/g, '-').toLowerCase()}-info`}
            >
              i
            </button>
            <div
              id={`${card.label.replace(/\s+/g, '-').toLowerCase()}-info`}
              role="tooltip"
              className={`pointer-events-none absolute top-7 hidden w-[min(17rem,calc(100vw-2rem))] rounded-lg border border-amber-400/30 bg-[#070b0c]/98 p-3 text-[0.74rem] font-medium leading-5 text-slate-200 shadow-2xl shadow-black/70 backdrop-blur-sm group-hover/info:block group-focus-within/info:block ${getTooltipPlacement(index)}`}
            >
              <span className="mb-1 block text-[0.62rem] font-bold uppercase tracking-[0.18em] text-amber-300">
                Quick meaning
              </span>
              {card.info}
            </div>
          </div>
          <div className={`absolute inset-0 bg-gradient-to-br ${card.accent.replace(/border-[^ ]+ /, '')} opacity-90 transition-opacity group-hover:opacity-100`} />
          <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_70%_30%,#facc15,transparent_22%),linear-gradient(135deg,#fbbf24_1px,transparent_1px)] bg-[size:18px_18px]" />
          <div className="relative flex h-full items-center gap-3">
            <div className="shrink-0 scale-95 drop-shadow-[0_0_18px_rgba(251,191,36,0.12)]">{renderIcon(card.icon, card.tone)}</div>
            <div className="min-w-0">
              <p className={`text-[0.64rem] font-bold uppercase tracking-[0.18em] ${card.tone}`}>{card.label}</p>
              <p
                className={`mt-1.5 max-w-full break-words font-semibold leading-none tracking-tight text-white ${
                  String(card.value).length > 12 ? 'text-[clamp(1.25rem,1.4vw,1.6rem)] leading-tight' : 'text-[clamp(1.75rem,2vw,2.35rem)]'
                }`}
                title={String(card.value)}
              >
                {card.value}
              </p>
              <p className="mt-1 text-xs text-slate-400">{card.note}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
