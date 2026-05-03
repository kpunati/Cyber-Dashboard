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

function normalizeSeverity(severity?: string): ThreatItem['severity'] {
  const normalized = severity?.toUpperCase();
  if (normalized === 'CRITICAL' || normalized === 'HIGH' || normalized === 'MEDIUM' || normalized === 'LOW') {
    return normalized;
  }
  return 'UNKNOWN';
}

function getPublishedTime(item: ThreatItem): number {
  const date = item.datePublished ?? item.dateAddedToKev ?? item.dueDate;
  return date ? new Date(date).getTime() || 0 : 0;
}

function byNewest(a: ThreatItem, b: ThreatItem): number {
  return getPublishedTime(b) - getPublishedTime(a);
}

function byPriority(a: ThreatItem, b: ThreatItem): number {
  return (
    Number(Boolean(b.isKnownExploited)) - Number(Boolean(a.isKnownExploited)) ||
    (b.epssScore ?? 0) - (a.epssScore ?? 0) ||
    severityRank[b.severity ?? 'UNKNOWN'] - severityRank[a.severity ?? 'UNKNOWN'] ||
    byNewest(a, b)
  );
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
    allItems.push({
      id: item.cveID,
      source: 'CISA_KEV',
      cveId: item.cveID,
      title: item.vulnerabilityName || item.cveID,
      vendor: item.vendorProject,
      product: item.product,
      isKnownExploited: true,
      dateAddedToKev: item.dateAdded,
      dueDate: item.dueDate,
      url: item.notes,
    });
  });

  // Process NVD data
  nvdData.forEach((item: any) => {
    const existing = allItems.find(i => i.cveId === item.cveId);
    if (existing) {
      // Merge
      existing.description = item.descriptions?.[0]?.value;
      existing.severity = normalizeSeverity(item.cvssData?.baseSeverity);
      existing.cvssScore = item.cvssData?.baseScore;
      existing.datePublished = item.published;
    } else {
      allItems.push({
        id: item.cveId,
        source: 'NVD',
        cveId: item.cveId,
        title: item.cveId,
        description: item.descriptions?.[0]?.value,
        severity: normalizeSeverity(item.cvssData?.baseSeverity),
        cvssScore: item.cvssData?.baseScore,
        datePublished: item.published,
      });
    }
  });

  // Process GitHub advisories
  githubData.forEach((item: any) => {
    const vulnerability = item.vulnerabilities?.[0];
    allItems.push({
      id: item.ghsa_id,
      source: 'GITHUB_ADVISORY',
      cveId: item.cve_id,
      title: item.summary,
      description: item.description,
      ecosystem: vulnerability?.package?.ecosystem ?? item.package?.ecosystem,
      packageName: vulnerability?.package?.name ?? item.package?.name,
      severity: normalizeSeverity(item.severity),
      datePublished: item.published_at,
      url: item.html_url,
    });
  });

  // Process EPSS data
  epssData.forEach((item: any) => {
    const existing = allItems.find(i => i.cveId === item.cve);
    if (existing) {
      existing.epssScore = item.epss;
      existing.epssPercentile = item.percentile;
    } else {
      // Add EPSS-only items for recent high-scoring ones
      if (item.epss > 0.0001) { // Include items with any meaningful EPSS score
        allItems.push({
          id: item.cve,
          source: 'EPSS',
          cveId: item.cve,
          title: item.cve,
          epssScore: item.epss,
          epssPercentile: item.percentile,
          datePublished: item.date,
        });
      }
    }
  });

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
    if (item.datePublished) {
      const date = new Date(item.datePublished).toISOString().split('T')[0];
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
