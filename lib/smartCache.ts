/**
 * Smart Quote Provider mit Caching und Rate Limiting
 * 
 * Features:
 * - LRU Cache (5 Minuten TTL)
 * - Rate Limiting pro Provider
 * - Waterfall Strategy (erst Provider 1, dann 2, dann 3)
 * - Deduplizierung von Ergebnissen
 */

import { LRUCache } from 'lru-cache';
import type { Quote } from '@/types';

// ============================================================================
// CACHE SYSTEM
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  provider: string;
}

const responseCache = new LRUCache<string, CacheEntry<any>>({
  max: 500, // Maximal 500 Einträge
  ttl: 1000 * 60 * 5, // 5 Minuten TTL
  updateAgeOnGet: true, // Reset TTL bei Zugriff
});

export function getCached<T>(key: string, maxAge: number = 300000): T | null {
  const cached = responseCache.get(key);
  if (!cached) return null;
  
  // Prüfe ob Cache noch gültig
  if (Date.now() - cached.timestamp > maxAge) {
    responseCache.delete(key);
    return null;
  }
  
  return cached.data;
}

export function setCache<T>(key: string, data: T, provider: string): void {
  responseCache.set(key, {
    data,
    timestamp: Date.now(),
    provider,
  });
}

// ============================================================================
// RATE LIMITING
// ============================================================================

interface RateLimit {
  requests: number;
  resetAt: number;
  maxPerMinute: number;
}

const rateLimits: Record<string, RateLimit> = {
  yahoo: { requests: 0, resetAt: Date.now() + 60000, maxPerMinute: 100 },
  finnhub: { requests: 0, resetAt: Date.now() + 60000, maxPerMinute: 60 },
  coingecko: { requests: 0, resetAt: Date.now() + 60000, maxPerMinute: 10 },
  ing: { requests: 0, resetAt: Date.now() + 60000, maxPerMinute: 50 },
};

export function checkRateLimit(provider: string): boolean {
  const limit = rateLimits[provider];
  if (!limit) return true; // Kein Limit konfiguriert
  
  // Reset counter wenn Zeitfenster abgelaufen
  const now = Date.now();
  if (now > limit.resetAt) {
    limit.requests = 0;
    limit.resetAt = now + 60000;
  }
  
  // Prüfe ob Limit erreicht
  if (limit.requests >= limit.maxPerMinute) {
    console.warn(`⚠️ Rate limit reached for ${provider} (${limit.requests}/${limit.maxPerMinute})`);
    return false;
  }
  
  limit.requests++;
  return true;
}

export function getRateLimitStatus(provider: string): { available: number; resetIn: number } {
  const limit = rateLimits[provider];
  if (!limit) return { available: Infinity, resetIn: 0 };
  
  const now = Date.now();
  const available = Math.max(0, limit.maxPerMinute - limit.requests);
  const resetIn = Math.max(0, limit.resetAt - now);
  
  return { available, resetIn };
}

// ============================================================================
// DEDUPLIZIERUNG
// ============================================================================

export interface SearchResult {
  symbol: string;
  name: string;
  type?: string;
  exchange?: string;
  isin?: string;
  provider: string;
}

/**
 * Dedupliziert Suchergebnisse basierend auf Symbol/ISIN
 */
export function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const seen = new Map<string, SearchResult>();
  
  for (const result of results) {
    // Verwende ISIN als primären Key, falls vorhanden
    const key = result.isin || result.symbol.toUpperCase();
    
    if (!seen.has(key)) {
      seen.set(key, result);
    } else {
      // Bevorzuge Ergebnis mit mehr Informationen
      const existing = seen.get(key)!;
      if (result.isin && !existing.isin) {
        seen.set(key, result);
      }
    }
  }
  
  return Array.from(seen.values());
}

// ============================================================================
// STALE CACHE
// ============================================================================

/**
 * Gibt stale cache zurück wenn verfügbar (auch wenn abgelaufen)
 */
export function getStaleCache<T>(key: string): T | null {
  const cached = responseCache.get(key);
  if (!cached) return null;
  
  console.warn(`⚠️ Using stale cache for ${key} (age: ${Math.round((Date.now() - cached.timestamp) / 1000)}s)`);
  return cached.data;
}

// ============================================================================
// CACHE STATISTICS
// ============================================================================

export function getCacheStats() {
  return {
    size: responseCache.size,
    maxSize: responseCache.max,
    hitRate: 0, // TODO: Implementiere Hit-Rate Tracking
  };
}
