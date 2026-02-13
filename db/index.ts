/**
 * Database Client for Vercel Postgres with Drizzle ORM
 */

import { sql as vercelSql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import * as schema from './schema';

/**
 * Drizzle Database Instance
 * 
 * Uses Vercel Postgres client under the hood
 * All queries are type-safe and optimized for serverless
 */
export const db = drizzle(vercelSql, { schema });

/**
 * Direct SQL client (for raw queries if needed)
 * 
 * Example:
 * const result = await sql`SELECT * FROM users WHERE id = ${userId}`;
 */
export const sql = vercelSql;

/**
 * Database connection helper
 * Useful for checking connection health
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await sql`SELECT 1 as health`;
    return result.rows[0].health === 1;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

/**
 * Type exports for convenience
 */
export * from './schema';
