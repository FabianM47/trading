/**
 * Zentraler Redis/KV-Client
 *
 * Unterstützt:
 * 1. KV_REST_API_URL + KV_REST_API_TOKEN (Vercel KV / klassisch)
 * 2. REDIS_URL allein (z. B. Vercel Redis/Upstash: https://default:TOKEN@rest-xxx.upstash.io)
 *
 * Alle Stellen, die bisher @vercel/kv nutzen, importieren kv von hier.
 */

import { createClient } from '@vercel/kv';

function getKvClient(): ReturnType<typeof createClient> {
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  const redisUrl = process.env.REDIS_URL;

  if (kvUrl && kvToken) {
    return createClient({ url: kvUrl, token: kvToken });
  }

  if (redisUrl) {
    try {
      const u = new URL(redisUrl);
      const url = u.origin;
      const token = u.password || u.username || '';
      if (!url || !token) {
        throw new Error(
          'REDIS_URL must be in format https://default:YOUR_TOKEN@rest-xxx.upstash.io'
        );
      }
      return createClient({ url, token });
    } catch (err) {
      if (err instanceof TypeError && redisUrl && !redisUrl.startsWith('http')) {
        throw new Error(
          '@vercel/kv with REDIS_URL: only REST URLs (https://...) are supported. Use the REST URL from your Redis provider.'
        );
      }
      throw err;
    }
  }

  throw new Error(
    'Redis/KV not configured. Set either KV_REST_API_URL + KV_REST_API_TOKEN or REDIS_URL (REST URL with token, e.g. https://default:TOKEN@rest-xxx.upstash.io).'
  );
}

export const kv = getKvClient();
