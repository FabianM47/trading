/**
 * Database Utilities für Vercel Postgres
 * Verwende diesen Client für Datenbankoperationen
 */

// Beispiel für SQL-Client (später mit @vercel/postgres oder Prisma)
export async function queryDatabase(sql: string, params?: any[]) {
  if (!process.env.POSTGRES_URL) {
    console.warn('POSTGRES_URL not configured');
    return null;
  }

  try {
    // Hier würdest du @vercel/postgres verwenden:
    // import { sql } from '@vercel/postgres';
    // const result = await sql(queryString, ...params);
    
    console.log('Database query executed');
    return null;
  } catch (error) {
    console.error('Database query error:', error);
    return null;
  }
}

// Connection Pool Beispiel
export async function getDbConnection() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL not configured');
  }

  // Hier würdest du einen Connection Pool erstellen
  // import { Pool } from '@vercel/postgres';
  // return new Pool({ connectionString: process.env.POSTGRES_URL });
  
  return null;
}
