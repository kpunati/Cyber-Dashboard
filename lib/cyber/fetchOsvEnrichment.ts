import { CyberFetchResult } from './types';

export async function fetchOsvEnrichment(cveIds: string[]): Promise<CyberFetchResult<any>> {
  const fetchedAt = new Date().toISOString();
  const uniqueIds = Array.from(new Set(cveIds.map(id => id.trim().toUpperCase()).filter(Boolean))).slice(0, 200);

  if (uniqueIds.length === 0) {
    return {
      items: [],
      status: {
        id: 'GITHUB_ADVISORY',
        label: 'OSV enrichment',
        status: 'fallback',
        itemCount: 0,
        fetchedAt,
        message: 'No CVEs supplied for OSV enrichment.',
      },
    };
  }

  try {
    const items: any[] = [];

    for (const cveId of uniqueIds.slice(0, 25)) {
      const response = await fetch(`https://api.osv.dev/v1/vulns/${encodeURIComponent(cveId)}`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Cyber Threat Pulse/1.0',
        },
      });

      if (!response.ok) continue;
      const vuln = await response.json();
      if (vuln) {
        const affected = vuln.affected?.[0] ?? {};
        const pkg = affected.package ?? {};
        items.push({
          id: vuln.id,
          cveId,
          aliases: vuln.aliases ?? [],
          title: vuln.summary,
          description: vuln.details,
          ecosystem: pkg.ecosystem,
          packageName: pkg.name,
          severity: vuln.database_specific?.severity,
          published: vuln.published,
          modified: vuln.modified,
          url: `https://osv.dev/vulnerability/${vuln.id}`,
        });
      }
    }

    return {
      items,
      status: {
        id: 'GITHUB_ADVISORY',
        label: 'OSV enrichment',
        status: items.length ? 'live' : 'fallback',
        itemCount: items.length,
        fetchedAt,
        message: items.length ? undefined : 'OSV returned no matching vulnerabilities.',
      },
    };
  } catch (error) {
    console.warn('OSV enrichment failed:', error);
    return {
      items: [],
      status: {
        id: 'GITHUB_ADVISORY',
        label: 'OSV enrichment',
        status: 'fallback',
        itemCount: 0,
        fetchedAt,
        message: 'OSV enrichment unavailable.',
      },
    };
  }
}
