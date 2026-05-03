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

export async function fetchNvdCves(): Promise<CyberFetchResult<any>> {
  const endpoint = 'https://api.nvd.nist.gov/rest/json/cves/2.0';
  const now = new Date();
  const fetchedAt = now.toISOString();
  const weekAgo = new Date(now.valueOf() - 7 * 24 * 60 * 60 * 1000);
  const params = new URLSearchParams({
    resultsPerPage: '25',
    pubStartDate: weekAgo.toISOString(),
    pubEndDate: now.toISOString(),
  });

  try {
    const response = await fetch(`${endpoint}?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Cyber Threat Pulse/1.0',
      },
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

    const items = vulnerabilities.map((item: any) => {
      const cve = item.cve || {};
      const descriptions: any[] = cve.descriptions ?? [];
      const description = descriptions.find(desc => desc.lang === 'en')?.value ?? descriptions[0]?.value;
      const metrics = cve.metrics ?? {};
      const metricCandidates = [
        ...(metrics.cvssMetricV31 ?? []),
        ...(metrics.cvssMetricV30 ?? []),
        ...(metrics.cvssMetricV2 ?? []),
      ];
      const metric = metricCandidates[0] ?? {};
      const baseSeverity = metric.cvssData?.baseSeverity ?? metric.baseSeverity ?? 'UNKNOWN';
      const baseScore = metric.cvssData?.baseScore ?? metric.baseScore;

      return {
        cveId: cve.id,
        descriptions: [{ value: description }],
        cvssData: { baseSeverity, baseScore },
        published: cve.published,
      };
    });
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
