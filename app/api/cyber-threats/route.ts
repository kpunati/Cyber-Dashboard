import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { CyberDashboardData } from '@/lib/cyber/types';
import { fetchAndNormalizeData } from '@/lib/cyber/normalizeThreatData';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Redis client for production caching
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// Fallback in-memory cache for development
let cachedData: CyberDashboardData | null = null;
let lastFetch = 0;
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours
const CACHE_KEY = 'cyber-threat-data';

function withCacheStatus(
  data: CyberDashboardData,
  status: CyberDashboardData['cache']['status'],
  provider: CyberDashboardData['cache']['provider']
): CyberDashboardData {
  return {
    ...data,
    cache: {
      ...data.cache,
      status,
      provider,
      cachedAt: status === 'fresh' ? new Date().toISOString() : data.cache.cachedAt,
    },
  };
}

async function getCachedData(): Promise<CyberDashboardData | null> {
  if (redis) {
    try {
      const cached = await redis.get<CyberDashboardData>(CACHE_KEY);
      return cached;
    } catch (error) {
      console.error('Redis cache read error:', error);
      return null;
    }
  } else {
    // Fallback to in-memory cache
    const now = Date.now();
    if (cachedData && (now - lastFetch) < CACHE_DURATION) {
      return cachedData;
    }
    return null;
  }
}

async function setCachedData(data: CyberDashboardData): Promise<void> {
  if (redis) {
    try {
      await redis.setex(CACHE_KEY, CACHE_DURATION / 1000, data);
    } catch (error) {
      console.error('Redis cache write error:', error);
    }
  } else {
    // Fallback to in-memory cache
    cachedData = data;
    lastFetch = Date.now();
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const allowDevCacheControls = process.env.NODE_ENV !== 'production';
    const skipCache = allowDevCacheControls && searchParams.get('skipCache') === '1';
    const forceError = allowDevCacheControls && searchParams.get('forceError') === '1';

    // Try to get cached data first
    const cached = skipCache ? null : await getCachedData();
    if (cached) {
      return NextResponse.json(withCacheStatus(cached, 'cached', redis ? 'redis' : 'memory'));
    }

    if (forceError) {
      throw new Error('Forced cyber threat fetch failure for development cache validation.');
    }

    // Fetch fresh data
    const data = await fetchAndNormalizeData();
    const dataWithCache = withCacheStatus(data, 'fresh', redis ? 'redis' : 'memory');

    // Cache the data
    await setCachedData(dataWithCache);

    return NextResponse.json(dataWithCache);
  } catch (error) {
    console.error('Error fetching cyber threat data:', error);

    // Try to return cached data even if fetch failed
    const cached = await getCachedData();
    if (cached) {
      return NextResponse.json(withCacheStatus(cached, 'stale', redis ? 'redis' : 'memory'));
    }

    return NextResponse.json(
      { error: 'Failed to fetch cyber threat data' },
      { status: 500 }
    );
  }
}
