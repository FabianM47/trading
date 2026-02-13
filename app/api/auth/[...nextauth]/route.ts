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

export const { GET, POST } = handlers;
