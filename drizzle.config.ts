/**
 * Drizzle Kit Configuration
 * 
 * This file is only used locally for migrations.
 * On Vercel, we use `drizzle-orm` directly without this config.
 */

export default {
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
  verbose: true,
  strict: true,
};
