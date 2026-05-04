import { ThreatItem } from './types';

function getCveKey(item: ThreatItem): string {
  return item.cveId?.trim().toUpperCase() || item.id;
}

function countUniqueCves(items: ThreatItem[], predicate: (item: ThreatItem) => boolean): number {
  return new Set(items.filter(predicate).map(getCveKey)).size;
}

function topByCount(counts: Record<string, number>): string {
  return Object.entries(counts)
    .sort(([labelA, countA], [labelB, countB]) => countB - countA || labelA.localeCompare(labelB))
    .map(([label]) => label)[0] ?? '';
}

export function computeThreatStats(items: ThreatItem[]) {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const isLast7Days = (date?: string) => {
    if (!date) return false;
    const time = new Date(date).getTime();
    return Number.isFinite(time) && time >= sevenDaysAgo && time <= now;
  };

  const knownExploitedCount = countUniqueCves(items, i => Boolean(i.isKnownExploited));
  const criticalCount = countUniqueCves(items, i => i.severity === 'CRITICAL');
  const highEpssCount = countUniqueCves(items, i => (i.epssScore || 0) >= 0.5 || (i.epssPercentile || 0) >= 0.95);
  const openSourceAdvisoryCount = items.filter(i => i.source === 'GITHUB_ADVISORY').length;
  const knownExploitedLast7Days = countUniqueCves(items, i => Boolean(i.isKnownExploited) && isLast7Days(i.dateAddedToKev));
  const criticalLast7Days = countUniqueCves(items, i => i.severity === 'CRITICAL' && isLast7Days(i.datePublished));
  const highEpssLast7Days = countUniqueCves(
    items,
    i => ((i.epssScore || 0) >= 0.5 || (i.epssPercentile || 0) >= 0.95) && isLast7Days(i.datePublished),
  );
  const openSourceAdvisoriesLast7Days = items.filter(i => i.source === 'GITHUB_ADVISORY' && isLast7Days(i.datePublished)).length;

  const ecosystems = items
    .filter(i => i.ecosystem)
    .reduce((acc, i) => {
      acc[i.ecosystem!] = (acc[i.ecosystem!] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  const topEcosystem = topByCount(ecosystems);

  const vendors = items
    .filter(i => i.vendor)
    .reduce((acc, i) => {
      acc[i.vendor!] = (acc[i.vendor!] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  const topVendor = topByCount(vendors);

  return {
    knownExploitedCount,
    criticalCount,
    highEpssCount,
    openSourceAdvisoryCount,
    topEcosystem,
    topVendor,
    trends: {
      knownExploitedLast7Days,
      criticalLast7Days,
      highEpssLast7Days,
      openSourceAdvisoriesLast7Days,
      topEcosystemAdvisories: topEcosystem ? ecosystems[topEcosystem] : 0,
      topVendorCves: topVendor ? vendors[topVendor] : 0,
    },
  };
}
