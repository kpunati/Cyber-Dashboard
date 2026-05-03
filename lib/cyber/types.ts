export type ThreatItem = {
  id: string;
  source: "CISA_KEV" | "NVD" | "GITHUB_ADVISORY" | "EPSS";
  cveId?: string;
  title: string;
  description?: string;
  vendor?: string;
  product?: string;
  ecosystem?: string;
  packageName?: string;
  severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  cvssScore?: number;
  epssScore?: number;
  epssPercentile?: number;
  isKnownExploited?: boolean;
  datePublished?: string;
  dateAddedToKev?: string;
  dueDate?: string;
  url?: string;
};

export type CyberSourceId = "CISA_KEV" | "NVD" | "GITHUB_ADVISORY" | "EPSS";

export type CyberSourceStatus = {
  id: CyberSourceId;
  label: string;
  status: "live" | "cached" | "fallback" | "error";
  itemCount: number;
  fetchedAt: string;
  message?: string;
};

export type CyberFetchResult<T> = {
  items: T[];
  status: CyberSourceStatus;
};

export type CyberDashboardData = {
  generatedAt: string;
  sourceStatus: Record<CyberSourceId, CyberSourceStatus>;
  cache: {
    status: "fresh" | "cached" | "stale" | "fallback";
    provider: "redis" | "memory" | "none";
    cachedAt?: string;
  };
  summary: {
    knownExploitedCount: number;
    criticalCount: number;
    highEpssCount: number;
    openSourceAdvisoryCount: number;
    topEcosystem: string;
    topVendor: string;
    trends?: {
      knownExploitedLast7Days: number;
      criticalLast7Days: number;
      highEpssLast7Days: number;
      openSourceAdvisoriesLast7Days: number;
      topEcosystemAdvisories: number;
      topVendorCves: number;
    };
  };
  exploited: ThreatItem[];
  recentCves: ThreatItem[];
  advisories: ThreatItem[];
  epssLeaderboard: ThreatItem[];
  charts: {
    severityDistribution: Record<string, number>;
    ecosystemDistribution: Record<string, number>;
    vendorDistribution: Record<string, number>;
    timeline: {
      date: string;
      count: number;
    }[];
  };
};
