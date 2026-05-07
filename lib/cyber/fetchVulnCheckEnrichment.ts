import { CyberFetchResult } from './types';

export async function fetchVulnCheckEnrichment(cveIds: string[]): Promise<CyberFetchResult<any>> {
  const fetchedAt = new Date().toISOString();
  const token = process.env.VULNCHECK_API_TOKEN;

  if (!token) {
    return {
      items: [],
      status: {
        id: 'NVD',
        label: 'VulnCheck enrichment',
        status: 'fallback',
        itemCount: 0,
        fetchedAt,
        message: 'VulnCheck enrichment disabled; VULNCHECK_API_TOKEN is not configured.',
      },
    };
  }

  const uniqueIds = Array.from(new Set(cveIds.map(id => id.trim().toUpperCase()).filter(Boolean))).slice(0, 30);
  const items: any[] = [];

  try {
    for (const cveId of uniqueIds) {
      const response = await fetch(`https://api.vulncheck.com/v3/index/nist-nvd2?cve=${encodeURIComponent(cveId)}`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'User-Agent': 'Cyber Threat Pulse/1.0',
        },
      });

      if (!response.ok) continue;
      const data = await response.json();
      const vulnerabilities = data.data ?? data._data ?? [];
      const vulnerability = Array.isArray(vulnerabilities) ? vulnerabilities[0] : vulnerabilities;
      if (vulnerability) {
        items.push({
          cveId,
          vulnerability,
        });
      }
    }

    return {
      items,
      status: {
        id: 'NVD',
        label: 'VulnCheck enrichment',
        status: items.length ? 'live' : 'fallback',
        itemCount: items.length,
        fetchedAt,
        message: items.length ? undefined : 'VulnCheck returned no matching enrichment.',
      },
    };
  } catch (error) {
    console.warn('VulnCheck enrichment failed:', error);
    return {
      items,
      status: {
        id: 'NVD',
        label: 'VulnCheck enrichment',
        status: 'fallback',
        itemCount: items.length,
        fetchedAt,
        message: 'VulnCheck enrichment unavailable.',
      },
    };
  }
}
