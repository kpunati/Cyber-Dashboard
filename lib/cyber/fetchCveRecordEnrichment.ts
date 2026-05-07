import { CyberFetchResult } from './types';

function cvePath(cveId: string) {
  const match = cveId.match(/^CVE-(\d{4})-(\d+)$/i);
  if (!match) return null;
  const [, year, numericId] = match;
  const bucket = `${Math.floor(Number(numericId) / 1000)}xxx`;
  return `${year}/${bucket}/${cveId.toUpperCase()}.json`;
}

function extractCvss(containers: any) {
  const metrics = [
    ...(containers?.cna?.metrics ?? []),
    ...((containers?.adp ?? []).flatMap((provider: any) => provider.metrics ?? [])),
  ];

  for (const metric of metrics) {
    const cvss = metric.cvssV4_0 ?? metric.cvssV3_1 ?? metric.cvssV3_0 ?? metric.cvssV2_0;
    if (cvss?.baseScore || cvss?.baseSeverity) {
      return {
        baseScore: cvss.baseScore,
        baseSeverity: cvss.baseSeverity,
        vectorString: cvss.vectorString,
      };
    }
  }

  return undefined;
}

function normalizeCveRecord(record: any, cveId: string, source: string) {
  const containers = record.containers ?? {};
  const cna = containers.cna ?? {};
  const affected = cna.affected?.[0] ?? {};
  const description = cna.descriptions?.find((entry: any) => entry.lang === 'en')?.value ?? cna.descriptions?.[0]?.value;
  const cvssData = extractCvss(containers);

  return {
    cveId,
    source,
    title: cna.title,
    descriptions: description ? [{ value: description }] : [],
    vendor: affected.vendor,
    product: affected.product,
    cvssData,
    published: record.cveMetadata?.datePublished,
    url: `https://www.cve.org/CVERecord?id=${cveId}`,
  };
}

export async function fetchCveRecordEnrichment(cveIds: string[]): Promise<CyberFetchResult<any>> {
  const fetchedAt = new Date().toISOString();
  const uniqueIds = Array.from(new Set(cveIds.map(id => id.trim().toUpperCase()).filter(Boolean))).slice(0, 30);
  const items: any[] = [];

  try {
    for (const cveId of uniqueIds) {
      const path = cvePath(cveId);
      if (!path) continue;
      const urls = [
        `https://raw.githubusercontent.com/cisagov/vulnrichment/develop/${path}`,
        `https://raw.githubusercontent.com/CVEProject/cvelistV5/main/cves/${path}`,
      ];

      for (const url of urls) {
        const response = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Cyber Threat Pulse/1.0',
          },
        });
        if (!response.ok) continue;
        const record = await response.json();
        items.push(normalizeCveRecord(record, cveId, url.includes('vulnrichment') ? 'CISA_VULNRICHMENT' : 'CVE_PROJECT'));
        break;
      }
    }

    return {
      items,
      status: {
        id: 'NVD',
        label: 'CVE record enrichment',
        status: items.length ? 'live' : 'fallback',
        itemCount: items.length,
        fetchedAt,
        message: items.length ? undefined : 'No CVE record enrichment found.',
      },
    };
  } catch (error) {
    console.warn('CVE record enrichment failed:', error);
    return {
      items,
      status: {
        id: 'NVD',
        label: 'CVE record enrichment',
        status: 'fallback',
        itemCount: items.length,
        fetchedAt,
        message: 'CVE record enrichment unavailable.',
      },
    };
  }
}
