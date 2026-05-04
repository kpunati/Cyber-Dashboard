import { CyberDashboardData, ThreatItem } from './types';
import { fetchCisaKev } from './fetchCisaKev';
import { fetchNvdCves } from './fetchNvdCves';
import { fetchGithubAdvisories } from './fetchGithubAdvisories';
import { fetchEpss } from './fetchEpss';
import { computeThreatStats } from './computeThreatStats';

const severityRank = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  UNKNOWN: 0,
} as const;

const sourceRank: Record<ThreatItem['source'], number> = {
  CISA_KEV: 4,
  NVD: 3,
  GITHUB_ADVISORY: 2,
  EPSS: 1,
};

function normalizeSeverity(severity?: string): ThreatItem['severity'] {
  const normalized = severity?.toUpperCase();
  if (normalized === 'CRITICAL' || normalized === 'HIGH' || normalized === 'MEDIUM' || normalized === 'LOW') {
    return normalized;
  }
  return 'UNKNOWN';
}

function normalizeCveId(cveId?: string): string | undefined {
  const normalized = cveId?.trim().toUpperCase();
  return normalized?.startsWith('CVE-') ? normalized : undefined;
}

function normalizeNumber(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

function pickText(...values: Array<string | undefined>): string | undefined {
  return values.map(value => value?.trim()).find(Boolean);
}

function getDateTime(date?: string): number {
  if (!date) return 0;
  const time = new Date(date).getTime();
  return Number.isFinite(time) ? time : 0;
}

function normalizeDate(date?: string): string | undefined {
  if (!date) return undefined;
  const time = getDateTime(date);
  return time ? new Date(time).toISOString() : undefined;
}

function isPlaceholderTitle(item: ThreatItem): boolean {
  const title = item.title.trim().toUpperCase();
  return title === item.cveId || title === item.id.toUpperCase();
}

function getPublishedTime(item: ThreatItem): number {
  const date = item.datePublished ?? item.dateAddedToKev ?? item.dueDate;
  return getDateTime(date);
}

function getEarliestTime(...dates: Array<string | undefined>): string | undefined {
  return dates
    .map(normalizeDate)
    .filter((date): date is string => Boolean(date))
    .sort((a, b) => getDateTime(a) - getDateTime(b))[0];
}

function byNewest(a: ThreatItem, b: ThreatItem): number {
  return getPublishedTime(b) - getPublishedTime(a) || a.id.localeCompare(b.id);
}

function byPriority(a: ThreatItem, b: ThreatItem): number {
  return (
    Number(Boolean(b.isKnownExploited)) - Number(Boolean(a.isKnownExploited)) ||
    (b.epssScore ?? 0) - (a.epssScore ?? 0) ||
    severityRank[b.severity ?? 'UNKNOWN'] - severityRank[a.severity ?? 'UNKNOWN'] ||
    byNewest(a, b) ||
    sourceRank[b.source] - sourceRank[a.source] ||
    a.id.localeCompare(b.id)
  );
}

function enrichCorrelatedItems(items: ThreatItem[]): ThreatItem[] {
  const byCve = new Map<string, ThreatItem[]>();

  items.forEach(item => {
    const cveId = normalizeCveId(item.cveId);
    if (!cveId) return;
    item.cveId = cveId;
    byCve.set(cveId, [...(byCve.get(cveId) ?? []), item]);
  });

  byCve.forEach(group => {
    const rankedByPriority = [...group].sort(byPriority);
    const rankedByNewest = [...group].sort(byNewest);
    const cveId = group[0].cveId;
    const kevItem = group.find(item => item.source === 'CISA_KEV');
    const nvdItem = group.find(item => item.source === 'NVD');
    const githubItem = group.find(item => item.source === 'GITHUB_ADVISORY');
    const epssItem = [...group]
      .filter(item => item.epssScore !== undefined || item.epssPercentile !== undefined)
      .sort((a, b) => (b.epssScore ?? -1) - (a.epssScore ?? -1) || (b.epssPercentile ?? -1) - (a.epssPercentile ?? -1))[0];
    const severity = [...group]
      .map(item => item.severity ?? 'UNKNOWN')
      .sort((a, b) => severityRank[b] - severityRank[a])[0];
    const cvssScore = [...group]
      .map(item => item.cvssScore)
      .filter((score): score is number => score !== undefined)
      .sort((a, b) => b - a)[0];
    const datePublished = getEarliestTime(...group.map(item => item.datePublished));
    const enrichment = {
      title: pickText(kevItem?.title, githubItem?.title, nvdItem?.title, rankedByPriority[0]?.title, cveId) ?? cveId ?? 'Unknown CVE',
      description: pickText(nvdItem?.description, githubItem?.description, rankedByNewest[0]?.description),
      vendor: pickText(kevItem?.vendor, nvdItem?.vendor, githubItem?.vendor, rankedByPriority[0]?.vendor),
      product: pickText(kevItem?.product, nvdItem?.product, githubItem?.product, rankedByPriority[0]?.product),
      ecosystem: pickText(githubItem?.ecosystem, rankedByPriority[0]?.ecosystem),
      packageName: pickText(githubItem?.packageName, rankedByPriority[0]?.packageName),
      severity,
      cvssScore,
      epssScore: epssItem?.epssScore,
      epssPercentile: epssItem?.epssPercentile,
      isKnownExploited: group.some(item => item.isKnownExploited),
      datePublished,
      dateAddedToKev: kevItem?.dateAddedToKev,
      dueDate: kevItem?.dueDate,
      url: pickText(kevItem?.url, githubItem?.url, nvdItem?.url, rankedByPriority[0]?.url),
    };

    group.forEach(item => {
      item.title = isPlaceholderTitle(item) ? enrichment.title : pickText(item.title, enrichment.title) ?? enrichment.title;
      item.description = pickText(item.description, enrichment.description);
      item.vendor = pickText(item.vendor, enrichment.vendor);
      item.product = pickText(item.product, enrichment.product);
      item.ecosystem = pickText(item.ecosystem, enrichment.ecosystem);
      item.packageName = pickText(item.packageName, enrichment.packageName);
      item.severity = item.severity && item.severity !== 'UNKNOWN' ? item.severity : enrichment.severity;
      item.cvssScore = item.cvssScore ?? enrichment.cvssScore;
      item.epssScore = item.epssScore ?? enrichment.epssScore;
      item.epssPercentile = item.epssPercentile ?? enrichment.epssPercentile;
      item.isKnownExploited = item.isKnownExploited || enrichment.isKnownExploited;
      item.datePublished = item.datePublished ?? enrichment.datePublished;
      item.dateAddedToKev = item.dateAddedToKev ?? enrichment.dateAddedToKev;
      item.dueDate = item.dueDate ?? enrichment.dueDate;
      item.url = item.url ?? enrichment.url;
    });
  });

  return items;
}

export async function fetchAndNormalizeData(): Promise<CyberDashboardData> {
  // Fetch data from all sources
  const [kevResult, nvdResult, githubResult, epssResult] = await Promise.all([
    fetchCisaKev(),
    fetchNvdCves(),
    fetchGithubAdvisories(),
    fetchEpss(),
  ]);
  const kevData = kevResult.items;
  const nvdData = nvdResult.items;
  const githubData = githubResult.items;
  const epssData = epssResult.items;

  // Normalize and merge data
  const allItems: ThreatItem[] = [];

  // Process KEV data
  kevData.forEach((item: any) => {
    const cveId = normalizeCveId(item.cveID);
    if (!cveId) return;
    allItems.push({
      id: cveId,
      source: 'CISA_KEV',
      cveId,
      title: pickText(item.vulnerabilityName, cveId) ?? cveId,
      vendor: pickText(item.vendorProject),
      product: pickText(item.product),
      severity: 'UNKNOWN',
      isKnownExploited: true,
      dateAddedToKev: normalizeDate(item.dateAdded),
      dueDate: normalizeDate(item.dueDate),
      url: item.notes,
    });
  });

  // Process NVD data
  nvdData.forEach((item: any) => {
    const cveId = normalizeCveId(item.cveId);
    if (!cveId) return;
    allItems.push({
      id: cveId,
      source: 'NVD',
      cveId,
      title: cveId,
      description: pickText(item.descriptions?.[0]?.value),
      vendor: pickText(item.vendor, item.vendorProject),
      product: pickText(item.product),
      severity: normalizeSeverity(item.cvssData?.baseSeverity),
      cvssScore: normalizeNumber(item.cvssData?.baseScore),
      datePublished: normalizeDate(item.published),
    });
  });

  // Process GitHub advisories
  githubData.forEach((item: any) => {
    const vulnerability = item.vulnerabilities?.[0];
    const cveId = normalizeCveId(item.cve_id);
    allItems.push({
      id: item.ghsa_id,
      source: 'GITHUB_ADVISORY',
      cveId,
      title: pickText(item.summary, item.ghsa_id) ?? item.ghsa_id,
      description: pickText(item.description),
      ecosystem: vulnerability?.package?.ecosystem ?? item.package?.ecosystem,
      packageName: vulnerability?.package?.name ?? item.package?.name,
      severity: normalizeSeverity(item.severity),
      datePublished: normalizeDate(item.published_at),
      url: item.html_url,
    });
  });

  // Process EPSS data
  epssData.forEach((item: any) => {
    const cveId = normalizeCveId(item.cve);
    const epssScore = normalizeNumber(item.epss);
    if (!cveId || epssScore === undefined || epssScore <= 0.0001) return;
    allItems.push({
      id: cveId,
      source: 'EPSS',
      cveId,
      title: cveId,
      severity: 'UNKNOWN',
      epssScore,
      epssPercentile: normalizeNumber(item.percentile),
      datePublished: normalizeDate(item.date),
    });
  });

  enrichCorrelatedItems(allItems);

  // Compute stats
  const stats = computeThreatStats(allItems);

  // Group data
  const exploited = allItems.filter(i => i.isKnownExploited).sort(byPriority).slice(0, 10);
  const recentCves = allItems.filter(i => i.source === 'NVD').sort(byNewest).slice(0, 20);
  const advisories = allItems.filter(i => i.source === 'GITHUB_ADVISORY').sort(byNewest).slice(0, 10);
  const epssLeaderboard = allItems
    .filter(i => i.epssScore !== undefined)
    .sort((a, b) => (b.epssScore || 0) - (a.epssScore || 0) || byPriority(a, b))
    .slice(0, 10);

  // Compute real chart data from normalized items
  const severityDistribution: Record<string, number> = {};
  const ecosystemDistribution: Record<string, number> = {};
  const vendorDistribution: Record<string, number> = {};
  const timelineMap: Record<string, number> = {};

  allItems.forEach(item => {
    // Severity distribution
    if (item.severity) {
      severityDistribution[item.severity] = (severityDistribution[item.severity] || 0) + 1;
    }

    // Ecosystem distribution (from GitHub advisories)
    if (item.ecosystem) {
      ecosystemDistribution[item.ecosystem] = (ecosystemDistribution[item.ecosystem] || 0) + 1;
    }

    // Vendor distribution
    if (item.vendor) {
      vendorDistribution[item.vendor] = (vendorDistribution[item.vendor] || 0) + 1;
    }

    // Timeline by date (last 30 days)
    const normalizedDate = normalizeDate(item.datePublished);
    if (normalizedDate) {
      const date = normalizedDate.split('T')[0];
      timelineMap[date] = (timelineMap[date] || 0) + 1;
    }
  });

  // Convert timeline map to sorted array
  const timeline = Object.entries(timelineMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30) // Last 30 days
    .map(([date, count]) => ({ date, count }));

  const charts = {
    severityDistribution,
    ecosystemDistribution,
    vendorDistribution,
    timeline,
  };

  return {
    generatedAt: new Date().toISOString(),
    sourceStatus: {
      CISA_KEV: kevResult.status,
      NVD: nvdResult.status,
      GITHUB_ADVISORY: githubResult.status,
      EPSS: epssResult.status,
    },
    cache: {
      status: 'fresh',
      provider: 'none',
      cachedAt: new Date().toISOString(),
    },
    summary: stats,
    exploited,
    recentCves,
    advisories,
    epssLeaderboard,
    charts,
  };
}
