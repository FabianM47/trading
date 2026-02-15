/**
 * Auth.js API Route Handler
 * 
 * Handles all authentication routes:
 * - GET/POST /api/auth/signin
 * - GET/POST /api/auth/signout
 * - GET/POST /api/auth/callback/:provider
 * - GET /api/auth/session
 * - etc.
 */

import { handlers } from '@/auth';

// Force Node.js runtime (required for Auth.js with database sessions)
export const runtime = 'nodejs';

export const { GET, POST } = handlers;
