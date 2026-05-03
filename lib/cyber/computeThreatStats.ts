import { ThreatItem } from './types';

export function computeThreatStats(items: ThreatItem[]) {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const isLast7Days = (date?: string) => {
    if (!date) return false;
    const time = new Date(date).getTime();
    return Number.isFinite(time) && time >= sevenDaysAgo && time <= now;
  };

  const knownExploitedCount = items.filter(i => i.isKnownExploited).length;
  const criticalCount = items.filter(i => i.severity === 'CRITICAL').length;
  const highEpssCount = items.filter(i => (i.epssScore || 0) >= 0.5 || (i.epssPercentile || 0) >= 0.95).length;
  const openSourceAdvisoryCount = items.filter(i => i.source === 'GITHUB_ADVISORY').length;
  const knownExploitedLast7Days = items.filter(i => i.isKnownExploited && isLast7Days(i.dateAddedToKev)).length;
  const criticalLast7Days = items.filter(i => i.severity === 'CRITICAL' && isLast7Days(i.datePublished)).length;
  const highEpssLast7Days = items.filter(i => ((i.epssScore || 0) >= 0.5 || (i.epssPercentile || 0) >= 0.95) && isLast7Days(i.datePublished)).length;
  const openSourceAdvisoriesLast7Days = items.filter(i => i.source === 'GITHUB_ADVISORY' && isLast7Days(i.datePublished)).length;

  const ecosystems = items
    .filter(i => i.ecosystem)
    .reduce((acc, i) => {
      acc[i.ecosystem!] = (acc[i.ecosystem!] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  const topEcosystem = Object.entries(ecosystems)
    .sort(([, a], [, b]) => b - a)
    .map(([ecosystem]) => ecosystem)[0] ?? '';

  const vendors = items
    .filter(i => i.vendor)
    .reduce((acc, i) => {
      acc[i.vendor!] = (acc[i.vendor!] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  const topVendor = Object.entries(vendors)
    .sort(([, a], [, b]) => b - a)
    .map(([vendor]) => vendor)[0] ?? '';

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
