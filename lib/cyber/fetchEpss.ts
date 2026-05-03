import { CyberFetchResult } from './types';

const fallbackEpss = [
  { cve: 'CVE-2026-12345', epss: 0.92, percentile: 0.98, date: new Date().toISOString() },
  { cve: 'CVE-2026-12346', epss: 0.81, percentile: 0.93, date: new Date().toISOString() },
];

export async function fetchEpss(): Promise<CyberFetchResult<any>> {
  const endpoint = 'https://api.first.org/data/v1/epss?format=json&limit=100';
  const fetchedAt = new Date().toISOString();

  try {
    const response = await fetch(endpoint, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Cyber Threat Pulse/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`EPSS fetch failed with status ${response.status}`);
    }

    const data = await response.json();
    const epssData = data.data ?? [];

    if (!Array.isArray(epssData) || epssData.length === 0) {
      return {
        items: fallbackEpss,
        status: {
          id: 'EPSS',
          label: 'FIRST EPSS',
          status: 'fallback',
          itemCount: fallbackEpss.length,
          fetchedAt,
          message: 'EPSS returned no scores; using preview data.',
        },
      };
    }

    const items = epssData.map((item: any) => ({
      cve: item.cve,
      epss: parseFloat(item.epss),
      percentile: parseFloat(item.percentile),
      date: item.date,
    }));
    return {
      items,
      status: {
        id: 'EPSS',
        label: 'FIRST EPSS',
        status: 'live',
        itemCount: items.length,
        fetchedAt,
      },
    };
  } catch (error) {
    console.warn('EPSS fetch failed:', error);
    return {
      items: fallbackEpss,
      status: {
        id: 'EPSS',
        label: 'FIRST EPSS',
        status: 'fallback',
        itemCount: fallbackEpss.length,
        fetchedAt,
        message: 'EPSS unavailable; using preview data.',
      },
    };
  }
}
