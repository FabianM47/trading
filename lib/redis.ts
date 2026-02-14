/**
 * Redis Client für Vercel KV
 * Verwende diesen Client für Caching und Session Management
 */

/**
 * Set cache value with type safety
 * @param key Cache key
 * @param value Value to cache (type-safe)
 * @param expirationSeconds Optional expiration in seconds
 * @returns true if successful, null if failed or not configured
 */
export async function setCache<T = unknown>(key: string, value: T, expirationSeconds?: number): Promise<boolean | null> {
  if (!process.env.REDIS_URL) {
    console.warn('REDIS_URL not configured');
    return null;
  }

  try {
    // Hier würdest du @vercel/kv verwenden
    // import { kv } from '@vercel/kv';
    // await kv.set(key, value, { ex: expirationSeconds });

    console.log(`Cache set: ${key}`);
    return true;
  } catch (error) {
    console.error('Redis set error:', error);
    return null;
  }
}

/**
 * Get cache value with type safety
 * @param key Cache key
 * @returns Cached value or null if not found/not configured
 */
export async function getCache<T = unknown>(key: string): Promise<T | null> {
  if (!process.env.REDIS_URL) {
    console.warn('REDIS_URL not configured');
    return null;
  }

  try {
    // Hier würdest du @vercel/kv verwenden
    // import { kv } from '@vercel/kv';
    // return await kv.get(key);

    console.log(`Cache get: ${key}`);
    return null;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
}

export async function deleteCache(key: string) {
  if (!process.env.REDIS_URL) {
    console.warn('REDIS_URL not configured');
    return null;
  }

  try {
    // Hier würdest du @vercel/kv verwenden
    // import { kv } from '@vercel/kv';
    // await kv.del(key);

    console.log(`Cache deleted: ${key}`);
    return true;
  } catch (error) {
    console.error('Redis delete error:', error);
    return null;
  }
}
