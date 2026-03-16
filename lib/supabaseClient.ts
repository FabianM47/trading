/**
 * Client-seitiger Supabase Client (Browser)
 *
 * Verwendet den Anon-Key (public) für Realtime-Subscriptions.
 * NICHT für serverseitige Operationen verwenden — dafür supabase.ts nutzen.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.warn('[Supabase] Client-seitige Env-Vars fehlen, Realtime nicht verfügbar');
    return null;
  }

  client = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  return client;
}
