/**
 * Zentraler Redis/KV-Client
 *
 * Unterstützt:
 * 1. KV_REST_API_URL + KV_REST_API_TOKEN (Vercel KV / klassisch)
 * 2. REDIS_URL allein (z. B. Vercel Redis/Upstash: https://default:TOKEN@rest-xxx.upstash.io)
 *
 * Alle Stellen, die bisher @vercel/kv nutzen, importieren kv von hier.
 * 
 * WICHTIG: Lazy initialization - der Client wird erst beim ersten Zugriff erstellt.
 * Dies verhindert Build-Fehler, wenn Redis-Umgebungsvariablen fehlen.
 */

import { createClient } from '@vercel/kv';

let kvClient: ReturnType<typeof createClient> | null = null;
let initError: Error | null = null;

function getKvClient(): ReturnType<typeof createClient> {
  // Return cached client if available
  if (kvClient) {
    return kvClient;
  }

  // Throw cached error if initialization failed before
  if (initError) {
    throw initError;
  }

  // Try to initialize
  try {
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;
    const redisUrl = process.env.REDIS_URL;

    if (kvUrl && kvToken) {
      kvClient = createClient({ url: kvUrl, token: kvToken });
      return kvClient;
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
        kvClient = createClient({ url, token });
        return kvClient;
      } catch (err) {
        if (err instanceof TypeError && redisUrl && !redisUrl.startsWith('http')) {
          initError = new Error(
            '@vercel/kv with REDIS_URL: only REST URLs (https://...) are supported. Use the REST URL from your Redis provider.'
          );
          throw initError;
        }
        throw err;
      }
    }

    initError = new Error(
      'Redis/KV not configured. Set either KV_REST_API_URL + KV_REST_API_TOKEN or REDIS_URL (REST URL with token, e.g. https://default:TOKEN@rest-xxx.upstash.io).'
    );
    throw initError;
  } catch (err) {
    if (!initError) {
      initError = err as Error;
    }
    throw initError;
  }
}

// Export eines Proxy-Objekts, das den Client lazy initialisiert
export const kv = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    const client = getKvClient();
    const value = client[prop as keyof typeof client];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});
