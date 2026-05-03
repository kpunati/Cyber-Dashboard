import { CyberFetchResult } from './types';

const fallbackCisaKev = [
  {
    cveID: 'CVE-2026-12345',
    vendorProject: 'Example Vendor',
    product: 'Example Product',
    vulnerabilityName: 'Remote code execution in example product',
    dateAdded: '2026-05-01',
    dueDate: '2026-05-15',
    notes: 'Sample fallback KEV entry',
  },
];

export async function fetchCisaKev(): Promise<CyberFetchResult<any>> {
  const url = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
  const fetchedAt = new Date().toISOString();

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`CISA KEV fetch failed with status ${response.status}`);
    }

    const data = await response.json();
    const items = data.vulnerabilities ?? fallbackCisaKev;
    return {
      items,
      status: {
        id: 'CISA_KEV',
        label: 'CISA KEV',
        status: data.vulnerabilities ? 'live' : 'fallback',
        itemCount: items.length,
        fetchedAt,
        message: data.vulnerabilities ? undefined : 'CISA returned no vulnerabilities; using preview data.',
      },
    };
  } catch (error) {
    console.warn('CISA KEV fetch failed:', error);
    return {
      items: fallbackCisaKev,
      status: {
        id: 'CISA_KEV',
        label: 'CISA KEV',
        status: 'fallback',
        itemCount: fallbackCisaKev.length,
        fetchedAt,
        message: 'CISA KEV unavailable; using preview data.',
      },
    };
  }
}
