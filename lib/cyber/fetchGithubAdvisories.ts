import { CyberFetchResult } from './types';

let cachedGithubAdvisories: any[] | null = null;
let lastGithubAdvisoriesFetch = 0;
const GITHUB_ADVISORIES_CACHE_MS = 60 * 1000; // 1 minute

const fallbackGithubAdvisories = [
  {
    ghsa_id: 'GHSA-sample-0001',
    cve_id: 'CVE-2026-12345',
    summary: 'Sample advisory: denial of service in sample library',
    description: 'This is a fallback advisory when GitHub cannot be reached.',
    package: { ecosystem: 'npm', name: 'sample-package' },
    severity: 'HIGH',
    published_at: new Date().toISOString(),
    html_url: 'https://github.com/advisories/GHSA-sample-0001',
  },
];

export async function fetchGithubAdvisories(): Promise<CyberFetchResult<any>> {
  const now = Date.now();
  const fetchedAt = new Date().toISOString();
  if (cachedGithubAdvisories && now - lastGithubAdvisoriesFetch < GITHUB_ADVISORIES_CACHE_MS) {
    return {
      items: cachedGithubAdvisories,
      status: {
        id: 'GITHUB_ADVISORY',
        label: 'GitHub Advisories',
        status: 'cached',
        itemCount: cachedGithubAdvisories.length,
        fetchedAt,
      },
    };
  }

  const endpoint = 'https://api.github.com/advisories?per_page=25';
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'Cyber Threat Pulse (github.com)',
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const response = await fetch(endpoint, { headers });
    if (!response.ok) {
      throw new Error(`GitHub advisories fetch failed with status ${response.status}`);
    }

    const data = await response.json();
    const advisories = Array.isArray(data) ? data : data.advisories ?? [];
    cachedGithubAdvisories = advisories;
    lastGithubAdvisoriesFetch = now;
    const items = advisories.length ? advisories : fallbackGithubAdvisories;
    return {
      items,
      status: {
        id: 'GITHUB_ADVISORY',
        label: 'GitHub Advisories',
        status: advisories.length ? 'live' : 'fallback',
        itemCount: items.length,
        fetchedAt,
        message: advisories.length ? undefined : 'GitHub returned no advisories; using preview data.',
      },
    };
  } catch (error) {
    console.warn('GitHub advisories fetch failed:', error);
    const items = cachedGithubAdvisories ?? fallbackGithubAdvisories;
    return {
      items,
      status: {
        id: 'GITHUB_ADVISORY',
        label: 'GitHub Advisories',
        status: cachedGithubAdvisories ? 'cached' : 'fallback',
        itemCount: items.length,
        fetchedAt,
        message: cachedGithubAdvisories
          ? 'GitHub unavailable; using recent in-memory advisory cache.'
          : 'GitHub unavailable; using preview data.',
      },
    };
  }
}
