import { CyberDashboardData, ThreatItem } from './types';
import { fetchCisaKev } from './fetchCisaKev';
import { fetchNvdCves, fetchNvdCvesByIds } from './fetchNvdCves';
import { fetchGithubAdvisories } from './fetchGithubAdvisories';
import { fetchEpss, fetchEpssForCves } from './fetchEpss';
import { fetchCveRecordEnrichment } from './fetchCveRecordEnrichment';
import { fetchOsvEnrichment } from './fetchOsvEnrichment';
import { fetchVulnCheckEnrichment } from './fetchVulnCheckEnrichment';
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

function addSource(item: ThreatItem, source: string | undefined) {
  if (!source) return;
  item.enrichmentSources = Array.from(new Set([...(item.enrichmentSources ?? []), source]));
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

function toDateKey(date?: string): string | undefined {
  const normalizedDate = normalizeDate(date);
  return normalizedDate?.split('T')[0];
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

function byDisplayPriority(a: ThreatItem, b: ThreatItem): number {
  return (
    sourceRank[b.source] - sourceRank[a.source] ||
    Number(Boolean(b.isKnownExploited)) - Number(Boolean(a.isKnownExploited)) ||
    severityRank[b.severity ?? 'UNKNOWN'] - severityRank[a.severity ?? 'UNKNOWN'] ||
    (b.epssScore ?? 0) - (a.epssScore ?? 0) ||
    byNewest(a, b) ||
    a.id.localeCompare(b.id)
  );
}

function uniqueByCveOrId(items: ThreatItem[]): ThreatItem[] {
  const grouped = new Map<string, ThreatItem[]>();

  items.forEach(item => {
    const key = normalizeCveId(item.cveId) ?? item.id;
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  });

  return Array.from(grouped.values()).map(group => [...group].sort(byDisplayPriority)[0]);
}

function hasContextBeyondEpss(item: ThreatItem): boolean {
  return Boolean(
    item.isKnownExploited ||
    (item.severity && item.severity !== 'UNKNOWN') ||
    item.cvssScore !== undefined ||
    item.vendor ||
    item.product ||
    item.packageName ||
    item.source !== 'EPSS',
  );
}

function isLowContextEpssOnly(item: ThreatItem): boolean {
  return item.source === 'EPSS' && !hasContextBeyondEpss(item) && (item.epssScore ?? 0) < 0.05;
}

function byEpssLeaderboard(a: ThreatItem, b: ThreatItem): number {
  return (
    Number(isLowContextEpssOnly(a)) - Number(isLowContextEpssOnly(b)) ||
    (b.epssScore ?? 0) - (a.epssScore ?? 0) ||
    Number(Boolean(b.isKnownExploited)) - Number(Boolean(a.isKnownExploited)) ||
    severityRank[b.severity ?? 'UNKNOWN'] - severityRank[a.severity ?? 'UNKNOWN'] ||
    byPriority(a, b)
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
    const severityItem = [...group]
      .filter(item => item.severity && item.severity !== 'UNKNOWN')
      .sort((a, b) => severityRank[b.severity ?? 'UNKNOWN'] - severityRank[a.severity ?? 'UNKNOWN'] || sourceRank[b.source] - sourceRank[a.source])[0];
    const severity = severityItem?.severity ?? 'UNKNOWN';
    const cvssItem = [...group]
      .filter(item => item.cvssScore !== undefined)
      .sort((a, b) => (b.cvssScore ?? 0) - (a.cvssScore ?? 0) || sourceRank[b.source] - sourceRank[a.source])[0];
    const cvssScore = cvssItem?.cvssScore;
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
      severitySource: severityItem?.severitySource ?? severityItem?.source,
      cvssSource: cvssItem?.cvssSource ?? cvssItem?.source,
      epssScore: epssItem?.epssScore,
      epssPercentile: epssItem?.epssPercentile,
      epssSource: epssItem?.epssSource ?? epssItem?.source,
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
      if (!item.severity || item.severity === 'UNKNOWN') {
        item.severity = enrichment.severity;
        item.severitySource = item.severity !== 'UNKNOWN' ? enrichment.severitySource : item.severitySource;
      }
      item.cvssScore = item.cvssScore ?? enrichment.cvssScore;
      item.cvssSource = item.cvssSource ?? enrichment.cvssSource;
      item.epssScore = item.epssScore ?? enrichment.epssScore;
      item.epssPercentile = item.epssPercentile ?? enrichment.epssPercentile;
      item.epssSource = item.epssSource ?? enrichment.epssSource;
      item.isKnownExploited = item.isKnownExploited || enrichment.isKnownExploited;
      item.datePublished = item.datePublished ?? enrichment.datePublished;
      item.dateAddedToKev = item.dateAddedToKev ?? enrichment.dateAddedToKev;
      item.dueDate = item.dueDate ?? enrichment.dueDate;
      item.url = item.url ?? enrichment.url;
      [
        kevItem?.source,
        nvdItem?.source,
        githubItem?.source,
        epssItem?.source,
        ...(group.flatMap(sourceItem => sourceItem.enrichmentSources ?? [])),
      ].forEach(source => addSource(item, source));
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
      enrichmentSources: ['CISA_KEV'],
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
      severitySource: item.cvssData?.baseSeverity ? 'NVD' : undefined,
      cvssSource: item.cvssData?.baseScore ? 'NVD' : undefined,
      datePublished: normalizeDate(item.published),
      url: item.url,
      enrichmentSources: ['NVD'],
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
      severitySource: item.severity ? 'GITHUB_ADVISORY' : undefined,
      datePublished: normalizeDate(item.published_at),
      url: item.html_url,
      enrichmentSources: ['GITHUB_ADVISORY'],
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
      epssSource: 'EPSS',
      datePublished: normalizeDate(item.date),
      enrichmentSources: ['EPSS'],
    });
  });

  const cveIds = Array.from(new Set(allItems.map(item => normalizeCveId(item.cveId)).filter((cveId): cveId is string => Boolean(cveId))));
  const missingContextCveIds = cveIds
    .filter(cveId => {
      const related = allItems.filter(item => normalizeCveId(item.cveId) === cveId);
      return related.some(item => item.isKnownExploited || item.source === 'EPSS')
        && !related.some(item => item.severity && item.severity !== 'UNKNOWN' && item.cvssScore !== undefined);
    })
    .slice(0, 20);
  const targetedEpssIds = cveIds.slice(0, 120);
  const osvIds = cveIds
    .filter(cveId => allItems.some(item => normalizeCveId(item.cveId) === cveId && item.source === 'GITHUB_ADVISORY'))
    .slice(0, 120);

  const [targetedNvdResult, targetedEpssResult, cveRecordResult, osvResult, vulnCheckResult] = await Promise.all([
    fetchNvdCvesByIds(missingContextCveIds),
    fetchEpssForCves(targetedEpssIds),
    fetchCveRecordEnrichment(missingContextCveIds),
    fetchOsvEnrichment(osvIds),
    fetchVulnCheckEnrichment(missingContextCveIds),
  ]);

  targetedNvdResult.items.forEach((item: any) => {
    const cveId = normalizeCveId(item.cveId);
    if (!cveId) return;
    allItems.push({
      id: `${cveId}-nvd-enrichment`,
      source: 'NVD',
      cveId,
      title: cveId,
      description: pickText(item.descriptions?.[0]?.value),
      vendor: pickText(item.vendor),
      product: pickText(item.product),
      severity: normalizeSeverity(item.cvssData?.baseSeverity),
      cvssScore: normalizeNumber(item.cvssData?.baseScore),
      severitySource: item.cvssData?.baseSeverity ? 'NVD' : undefined,
      cvssSource: item.cvssData?.baseScore ? 'NVD' : undefined,
      datePublished: normalizeDate(item.published),
      url: item.url,
      enrichmentSources: ['NVD_TARGETED'],
    });
  });

  targetedEpssResult.items.forEach((item: any) => {
    const cveId = normalizeCveId(item.cve);
    const epssScore = normalizeNumber(item.epss);
    if (!cveId || epssScore === undefined || epssScore <= 0.0001) return;
    allItems.push({
      id: `${cveId}-epss-enrichment`,
      source: 'EPSS',
      cveId,
      title: cveId,
      severity: 'UNKNOWN',
      epssScore,
      epssPercentile: normalizeNumber(item.percentile),
      epssSource: 'EPSS',
      datePublished: normalizeDate(item.date),
      enrichmentSources: ['EPSS_TARGETED'],
    });
  });

  cveRecordResult.items.forEach((item: any) => {
    const cveId = normalizeCveId(item.cveId);
    if (!cveId) return;
    allItems.push({
      id: `${cveId}-${item.source?.toLowerCase() ?? 'cve-record'}-enrichment`,
      source: 'NVD',
      cveId,
      title: pickText(item.title, cveId) ?? cveId,
      description: pickText(item.descriptions?.[0]?.value),
      vendor: pickText(item.vendor),
      product: pickText(item.product),
      severity: normalizeSeverity(item.cvssData?.baseSeverity),
      cvssScore: normalizeNumber(item.cvssData?.baseScore),
      severitySource: item.cvssData?.baseSeverity ? item.source : undefined,
      cvssSource: item.cvssData?.baseScore ? item.source : undefined,
      datePublished: normalizeDate(item.published),
      url: item.url,
      enrichmentSources: [item.source ?? 'CVE_RECORD'],
    });
  });

  osvResult.items.forEach((item: any) => {
    const cveId = normalizeCveId(item.cveId) ?? (item.aliases ?? []).map(normalizeCveId).find(Boolean);
    if (!cveId) return;
    allItems.push({
      id: item.id,
      source: 'GITHUB_ADVISORY',
      cveId,
      title: pickText(item.title, item.id) ?? item.id,
      description: pickText(item.description),
      ecosystem: item.ecosystem,
      packageName: item.packageName,
      severity: normalizeSeverity(item.severity),
      severitySource: item.severity ? 'OSV' : undefined,
      datePublished: normalizeDate(item.published),
      url: item.url,
      enrichmentSources: ['OSV'],
    });
  });

  vulnCheckResult.items.forEach((item: any) => {
    const cveId = normalizeCveId(item.cveId);
    const vulnerability = item.vulnerability ?? {};
    const metrics = vulnerability.metrics ?? vulnerability.cvss ?? {};
    const cvss = metrics.cvssV3_1 ?? metrics.cvssV3_0 ?? metrics.cvssV2_0 ?? metrics;
    if (!cveId) return;
    allItems.push({
      id: `${cveId}-vulncheck-enrichment`,
      source: 'NVD',
      cveId,
      title: cveId,
      description: pickText(vulnerability.descriptions?.[0]?.value, vulnerability.description),
      vendor: pickText(vulnerability.vendor, vulnerability.vendorProject),
      product: pickText(vulnerability.product),
      severity: normalizeSeverity(cvss.baseSeverity ?? vulnerability.severity),
      cvssScore: normalizeNumber(cvss.baseScore ?? vulnerability.cvssScore),
      severitySource: cvss.baseSeverity || vulnerability.severity ? 'VULNCHECK' : undefined,
      cvssSource: cvss.baseScore || vulnerability.cvssScore ? 'VULNCHECK' : undefined,
      datePublished: normalizeDate(vulnerability.published ?? vulnerability.publishedDate),
      url: vulnerability.url,
      enrichmentSources: ['VULNCHECK'],
    });
  });

  enrichCorrelatedItems(allItems);
  const canonicalItems = uniqueByCveOrId(allItems);

  // Compute stats
  const stats = computeThreatStats(canonicalItems);

  // Group data
  const exploited = uniqueByCveOrId(allItems.filter(i => i.isKnownExploited)).sort(byPriority).slice(0, 10);
  const recentCves = uniqueByCveOrId(allItems.filter(i => i.source === 'NVD')).sort(byNewest).slice(0, 20);
  const advisories = uniqueByCveOrId(allItems.filter(i => i.source === 'GITHUB_ADVISORY')).sort(byNewest).slice(0, 10);
  const epssLeaderboard = uniqueByCveOrId(allItems
    .filter(i => i.epssScore !== undefined)
  )
    .sort(byEpssLeaderboard)
    .slice(0, 10);

  // Compute real chart data from normalized items
  const severityDistribution: Record<string, number> = {};
  const ecosystemDistribution: Record<string, number> = {};
  const vendorDistribution: Record<string, number> = {};
  const timelineMap: Record<string, { cvePublished: number; kevAdded: number; ossAdvisories: number }> = {};
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const timelineStart = new Date(today);
  timelineStart.setUTCDate(today.getUTCDate() - 29);

  Array.from({ length: 30 }).forEach((_, index) => {
    const date = new Date(timelineStart);
    date.setUTCDate(timelineStart.getUTCDate() + index);
    timelineMap[date.toISOString().split('T')[0]] = {
      cvePublished: 0,
      kevAdded: 0,
      ossAdvisories: 0,
    };
  });

  canonicalItems.forEach(item => {
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

    const publishedDate = toDateKey(item.datePublished);
    const kevDate = toDateKey(item.dateAddedToKev);

    if (publishedDate && timelineMap[publishedDate]) {
      if (item.source === 'NVD') {
        timelineMap[publishedDate].cvePublished += 1;
      }
      if (item.source === 'GITHUB_ADVISORY') {
        timelineMap[publishedDate].ossAdvisories += 1;
      }
    }

    if (kevDate && timelineMap[kevDate]) {
      timelineMap[kevDate].kevAdded += 1;
    }
  });

  // Convert timeline map to sorted, gap-filled 30-day array.
  const timeline = Object.entries(timelineMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({
      date,
      count: values.cvePublished + values.kevAdded + values.ossAdvisories,
      ...values,
    }));

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
