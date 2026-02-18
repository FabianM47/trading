/**
 * Supabase Client Configuration
 * 
 * Initialisiert den Supabase Client für Server-seitige Anfragen.
 * Verwendet Umgebungsvariablen für URL und Service Role Key.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseServiceRoleKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

/**
 * Server-seitiger Supabase Client mit Service Role Key
 * Wird für Backend API Routes verwendet, um Daten benutzerspezifisch zu speichern
 */
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
