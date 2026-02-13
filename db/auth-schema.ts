/**
 * Auth.js / NextAuth Tables für Drizzle Adapter
 * 
 * Siehe: https://authjs.dev/getting-started/adapters/drizzle
 */

import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// ============================================================================
// AUTH USERS (modifiziert für unsere Trading App)
// ============================================================================

export const authUsers = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }),
    email: varchar('email', { length: 255 }).notNull().unique(),
    emailVerified: timestamp('emailVerified', { mode: 'date' }),
    image: text('image'),
    // Trading App specific fields
    defaultCurrency: varchar('default_currency', { length: 3 }).default('EUR').notNull(),
    totpEnabled: boolean('totp_enabled').default(false).notNull(),
    totpSecret: varchar('totp_secret', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  },
  (table) => ({
    emailIdx: index('idx_users_email').on(table.email),
  })
);

// ============================================================================
// AUTH ACCOUNTS (OAuth Providers)
// ============================================================================

export const authAccounts = pgTable(
  'accounts',
  {
    userId: uuid('userId')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 255 }).$type<'email' | 'oauth' | 'oidc' | 'webauthn'>().notNull(),
    provider: varchar('provider', { length: 255 }).notNull(),
    providerAccountId: varchar('providerAccountId', { length: 255 }).notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: varchar('token_type', { length: 255 }),
    scope: varchar('scope', { length: 255 }),
    id_token: text('id_token'),
    session_state: varchar('session_state', { length: 255 }),
  },
  (table) => ({
    compoundKey: primaryKey({ columns: [table.provider, table.providerAccountId] }),
    userIdIdx: index('idx_accounts_user_id').on(table.userId),
  })
);

// ============================================================================
// AUTH SESSIONS (DB Sessions)
// ============================================================================

export const authSessions = pgTable(
  'sessions',
  {
    sessionToken: varchar('sessionToken', { length: 255 }).primaryKey(),
    userId: uuid('userId')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (table) => ({
    userIdIdx: index('idx_sessions_user_id').on(table.userId),
  })
);

// ============================================================================
// AUTH VERIFICATION TOKENS (Email Magic Links)
// ============================================================================

export const authVerificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: varchar('identifier', { length: 255 }).notNull(),
    token: varchar('token', { length: 255 }).notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (table) => ({
    compoundKey: primaryKey({ columns: [table.identifier, table.token] }),
  })
);

// ============================================================================
// AUTH AUTHENTICATORS (WebAuthn - Future)
// ============================================================================

export const authAuthenticators = pgTable(
  'authenticators',
  {
    credentialID: varchar('credentialID', { length: 255 }).notNull().unique(),
    userId: uuid('userId')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    providerAccountId: varchar('providerAccountId', { length: 255 }).notNull(),
    credentialPublicKey: text('credentialPublicKey').notNull(),
    counter: integer('counter').notNull(),
    credentialDeviceType: varchar('credentialDeviceType', { length: 255 }).notNull(),
    credentialBackedUp: boolean('credentialBackedUp').notNull(),
    transports: varchar('transports', { length: 255 }),
  },
  (table) => ({
    compositePk: primaryKey({ columns: [table.userId, table.credentialID] }),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const authUsersRelations = relations(authUsers, ({ many }) => ({
  accounts: many(authAccounts),
  sessions: many(authSessions),
  authenticators: many(authAuthenticators),
}));

export const authAccountsRelations = relations(authAccounts, ({ one }) => ({
  user: one(authUsers, {
    fields: [authAccounts.userId],
    references: [authUsers.id],
  }),
}));

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(authUsers, {
    fields: [authSessions.userId],
    references: [authUsers.id],
  }),
}));

export const authAuthenticatorsRelations = relations(authAuthenticators, ({ one }) => ({
  user: one(authUsers, {
    fields: [authAuthenticators.userId],
    references: [authUsers.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type AuthUser = typeof authUsers.$inferSelect;
export type NewAuthUser = typeof authUsers.$inferInsert;
export type AuthAccount = typeof authAccounts.$inferSelect;
export type NewAuthAccount = typeof authAccounts.$inferInsert;
export type AuthSession = typeof authSessions.$inferSelect;
export type NewAuthSession = typeof authSessions.$inferInsert;
export type AuthVerificationToken = typeof authVerificationTokens.$inferSelect;
export type NewAuthVerificationToken = typeof authVerificationTokens.$inferInsert;
export type AuthAuthenticator = typeof authAuthenticators.$inferSelect;
export type NewAuthAuthenticator = typeof authAuthenticators.$inferInsert;
