/**
 * Redis Client für Vercel KV
 * Verwende diesen Client für Caching und Session Management
 */

// Für Vercel KV kannst du die REST API direkt verwenden
export async function setCache(key: string, value: any, expirationSeconds?: number) {
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

export async function getCache(key: string) {
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
