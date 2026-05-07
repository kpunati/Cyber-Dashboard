import { CyberFetchResult } from './types';

const fallbackNvdCves = [
  {
    cveId: 'CVE-2026-54321',
    descriptions: [{ value: 'Sample NVD CVE: Permission bypass in example component.' }],
    cvssData: { baseSeverity: 'HIGH', baseScore: 7.8 },
    published: new Date().toISOString(),
  },
  {
    cveId: 'CVE-2026-54322',
    descriptions: [{ value: 'Sample NVD CVE: Privilege escalation through example service.' }],
    cvssData: { baseSeverity: 'CRITICAL', baseScore: 9.1 },
    published: new Date().toISOString(),
  },
];

function getPublishedTime(item: { published?: string; cveId?: string }) {
  const parsed = item.published ? new Date(item.published).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeNvdVulnerability(item: any) {
  const cve = item.cve || {};
  const descriptions: any[] = cve.descriptions ?? [];
  const description = descriptions.find(desc => desc.lang === 'en')?.value ?? descriptions[0]?.value;
  const metrics = cve.metrics ?? {};
  const metricCandidates = [
    ...(metrics.cvssMetricV40 ?? []),
    ...(metrics.cvssMetricV31 ?? []),
    ...(metrics.cvssMetricV30 ?? []),
    ...(metrics.cvssMetricV2 ?? []),
  ];
  const metric = metricCandidates[0] ?? {};
  const weaknesses: any[] = cve.weaknesses ?? [];
  const cwe = weaknesses
    .flatMap(weakness => weakness.description ?? [])
    .find((entry: any) => entry.lang === 'en')?.value;

  const configurations: any[] = cve.configurations ?? [];
  const cpeMatch = configurations
    .flatMap(configuration => configuration.nodes ?? [])
    .flatMap(node => node.cpeMatch ?? [])
    .find(match => match.criteria);
  const cpeParts = typeof cpeMatch?.criteria === 'string' ? cpeMatch.criteria.split(':') : [];
  const cpeVendor = cpeParts[3]?.replace(/_/g, ' ');
  const cpeProduct = cpeParts[4]?.replace(/_/g, ' ');

  return {
    cveId: cve.id,
    descriptions: [{ value: description }],
    cvssData: {
      baseSeverity: metric.cvssData?.baseSeverity ?? metric.baseSeverity ?? 'UNKNOWN',
      baseScore: metric.cvssData?.baseScore ?? metric.baseScore,
      vectorString: metric.cvssData?.vectorString,
    },
    cwe,
    vendor: cpeVendor,
    product: cpeProduct,
    published: cve.published,
    lastModified: cve.lastModified,
    url: cve.id ? `https://nvd.nist.gov/vuln/detail/${cve.id}` : undefined,
  };
}

export async function fetchNvdCves(): Promise<CyberFetchResult<any>> {
  const endpoint = 'https://services.nvd.nist.gov/rest/json/cves/2.0';
  const now = new Date();
  const fetchedAt = now.toISOString();
  const weekAgo = new Date(now.valueOf() - 7 * 24 * 60 * 60 * 1000);
  const params = new URLSearchParams({
    resultsPerPage: '25',
    pubStartDate: weekAgo.toISOString(),
    pubEndDate: now.toISOString(),
  });

  try {
    const signal = typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
      ? AbortSignal.timeout(10000)
      : undefined;

    const response = await fetch(`${endpoint}?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Cyber Threat Pulse/1.0',
        ...(process.env.NVD_API_KEY ? { apiKey: process.env.NVD_API_KEY } : {}),
      },
      signal,
    });

    if (!response.ok) {
      throw new Error(`NVD CVE fetch failed with status ${response.status}`);
    }

    const data = await response.json();
    const vulnerabilities = data.vulnerabilities ?? data.result?.vulnerabilities ?? [];

    if (!Array.isArray(vulnerabilities) || vulnerabilities.length === 0) {
      return {
        items: fallbackNvdCves,
        status: {
          id: 'NVD',
          label: 'NVD',
          status: 'fallback',
          itemCount: fallbackNvdCves.length,
          fetchedAt,
          message: 'NVD returned no recent CVEs; using preview data.',
        },
      };
    }

    const items = vulnerabilities
      .map(normalizeNvdVulnerability)
      .sort((a: any, b: any) => getPublishedTime(b) - getPublishedTime(a) || String(a.cveId).localeCompare(String(b.cveId)));

    return {
      items,
      status: {
        id: 'NVD',
        label: 'NVD',
        status: 'live',
        itemCount: items.length,
        fetchedAt,
      },
    };
  } catch (error) {
    console.warn('NVD CVE fetch failed:', error);
    return {
      items: fallbackNvdCves,
      status: {
        id: 'NVD',
        label: 'NVD',
        status: 'fallback',
        itemCount: fallbackNvdCves.length,
        fetchedAt,
        message: 'NVD unavailable; using preview data.',
      },
    };
  }
}

export async function fetchNvdCvesByIds(cveIds: string[]): Promise<CyberFetchResult<any>> {
  const endpoint = 'https://services.nvd.nist.gov/rest/json/cves/2.0';
  const fetchedAt = new Date().toISOString();
  const uniqueIds = Array.from(new Set(cveIds.map(id => id.trim().toUpperCase()).filter(Boolean))).slice(0, 30);
  const signal = typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
    ? AbortSignal.timeout(12000)
    : undefined;
  const headers = {
    Accept: 'application/json',
    'User-Agent': 'Cyber Threat Pulse/1.0',
    ...(process.env.NVD_API_KEY ? { apiKey: process.env.NVD_API_KEY } : {}),
  };
  const items: any[] = [];

  try {
    for (const cveId of uniqueIds) {
      const params = new URLSearchParams({ cveId });
      const response = await fetch(`${endpoint}?${params.toString()}`, { headers, signal });
      if (!response.ok) continue;
      const data = await response.json();
      const vulnerability = (data.vulnerabilities ?? data.result?.vulnerabilities ?? [])[0];
      if (vulnerability) {
        items.push(normalizeNvdVulnerability(vulnerability));
      }
    }

    return {
      items,
      status: {
        id: 'NVD',
        label: 'NVD targeted enrichment',
        status: items.length ? 'live' : 'fallback',
        itemCount: items.length,
        fetchedAt,
        message: items.length ? undefined : 'Targeted NVD enrichment returned no matching CVEs.',
      },
    };
  } catch (error) {
    console.warn('Targeted NVD enrichment failed:', error);
    return {
      items,
      status: {
        id: 'NVD',
        label: 'NVD targeted enrichment',
        status: 'fallback',
        itemCount: items.length,
        fetchedAt,
        message: 'Targeted NVD enrichment unavailable.',
      },
    };
  }
}
