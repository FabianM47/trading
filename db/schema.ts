/**
 * Drizzle ORM Schema for Trading Portfolio App
 * 
 * This schema matches the PostgreSQL schema in db/schema.sql
 * Optimized for Vercel Postgres
 */

import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  inet,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// ============================================================================
// USERS
// ============================================================================

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }),
    totpSecret: varchar('totp_secret', { length: 255 }),
    totpEnabled: boolean('totp_enabled').default(false).notNull(),
    defaultCurrency: varchar('default_currency', { length: 3 }).default('EUR').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  },
  (table) => ({
    emailIdx: uniqueIndex('idx_users_email').on(table.email),
    createdAtIdx: index('idx_users_created_at').on(table.createdAt),
  })
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  portfolios: many(portfolios),
}));

// ============================================================================
// PORTFOLIOS
// ============================================================================

export const portfolios = pgTable(
  'portfolios',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    isDefault: boolean('is_default').default(false).notNull(),
    currency: varchar('currency', { length: 3 }).default('EUR').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('idx_portfolios_user_id').on(table.userId),
    userNameUnique: uniqueIndex('uq_portfolios_user_name').on(table.userId, table.name),
    isDefaultIdx: index('idx_portfolios_is_default').on(table.userId, table.isDefault),
  })
);

// Relations
export const portfoliosRelations = relations(portfolios, ({ one, many }) => ({
  user: one(users, {
    fields: [portfolios.userId],
    references: [users.id],
  }),
  trades: many(trades),
  positions: many(positions),
  instrumentGroups: many(instrumentGroups),
}));

// ============================================================================
// INSTRUMENTS
// ============================================================================

export const instruments = pgTable(
  'instruments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    isin: varchar('isin', { length: 12 }).notNull().unique(),
    symbol: varchar('symbol', { length: 20 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    exchange: varchar('exchange', { length: 50 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
    type: varchar('type', { length: 50 }).default('STOCK').notNull(),
    country: varchar('country', { length: 2 }),
    sector: varchar('sector', { length: 100 }),
    industry: varchar('industry', { length: 100 }),
    isActive: boolean('is_active').default(true).notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    isinIdx: uniqueIndex('idx_instruments_isin').on(table.isin),
    symbolIdx: index('idx_instruments_symbol').on(table.symbol),
    currencyIdx: index('idx_instruments_currency').on(table.currency),
    exchangeIdx: index('idx_instruments_exchange').on(table.exchange),
    isActiveIdx: index('idx_instruments_is_active').on(table.isActive),
  })
);

// Relations
export const instrumentsRelations = relations(instruments, ({ many }) => ({
  trades: many(trades),
  positions: many(positions),
  priceSnapshots: many(priceSnapshots),
  groupAssignments: many(instrumentGroupAssignments),
}));

// ============================================================================
// TRADES
// ============================================================================

export const trades = pgTable(
  'trades',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    portfolioId: uuid('portfolio_id')
      .notNull()
      .references(() => portfolios.id, { onDelete: 'restrict' }),
    instrumentId: uuid('instrument_id')
      .notNull()
      .references(() => instruments.id, { onDelete: 'restrict' }),
    tradeType: varchar('trade_type', { length: 10 }).notNull(), // 'BUY' or 'SELL'
    quantity: numeric('quantity', { precision: 20, scale: 8 }).notNull(),
    pricePerUnit: numeric('price_per_unit', { precision: 20, scale: 8 }).notNull(),
    totalAmount: numeric('total_amount', { precision: 20, scale: 8 }).notNull(),
    fees: numeric('fees', { precision: 20, scale: 8 }).default('0').notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
    exchangeRate: numeric('exchange_rate', { precision: 20, scale: 10 }).default('1.0').notNull(),
    notes: text('notes'),
    executedAt: timestamp('executed_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    portfolioIdIdx: index('idx_trades_portfolio_id').on(table.portfolioId),
    instrumentIdIdx: index('idx_trades_instrument_id').on(table.instrumentId),
    executedAtIdx: index('idx_trades_executed_at').on(table.executedAt),
    tradeTypeIdx: index('idx_trades_trade_type').on(table.tradeType),
    portfolioExecutedIdx: index('idx_trades_portfolio_executed').on(
      table.portfolioId,
      table.executedAt
    ),
  })
);

// Relations
export const tradesRelations = relations(trades, ({ one }) => ({
  portfolio: one(portfolios, {
    fields: [trades.portfolioId],
    references: [portfolios.id],
  }),
  instrument: one(instruments, {
    fields: [trades.instrumentId],
    references: [instruments.id],
  }),
}));

// ============================================================================
// POSITIONS (Aggregated View)
// ============================================================================

export const positions = pgTable(
  'positions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    portfolioId: uuid('portfolio_id')
      .notNull()
      .references(() => portfolios.id, { onDelete: 'cascade' }),
    instrumentId: uuid('instrument_id')
      .notNull()
      .references(() => instruments.id, { onDelete: 'restrict' }),
    totalQuantity: numeric('total_quantity', { precision: 20, scale: 8 }).notNull(),
    avgBuyPrice: numeric('avg_buy_price', { precision: 20, scale: 8 }).notNull(),
    totalInvested: numeric('total_invested', { precision: 20, scale: 8 }).notNull(),
    realizedPnl: numeric('realized_pnl', { precision: 20, scale: 8 }).default('0').notNull(),
    totalFees: numeric('total_fees', { precision: 20, scale: 8 }).default('0').notNull(),
    firstBuyAt: timestamp('first_buy_at', { withTimezone: true }).notNull(),
    lastTradeAt: timestamp('last_trade_at', { withTimezone: true }).notNull(),
    isClosed: boolean('is_closed').default(false).notNull(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    currency: varchar('currency', { length: 3 }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    portfolioIdIdx: index('idx_positions_portfolio_id').on(table.portfolioId),
    instrumentIdIdx: index('idx_positions_instrument_id').on(table.instrumentId),
    isClosedIdx: index('idx_positions_is_closed').on(table.isClosed),
    portfolioInstrumentUnique: uniqueIndex('uq_positions_portfolio_instrument').on(
      table.portfolioId,
      table.instrumentId
    ),
    portfolioActiveIdx: index('idx_positions_portfolio_active').on(
      table.portfolioId,
      table.isClosed
    ),
  })
);

// Relations
export const positionsRelations = relations(positions, ({ one }) => ({
  portfolio: one(portfolios, {
    fields: [positions.portfolioId],
    references: [portfolios.id],
  }),
  instrument: one(instruments, {
    fields: [positions.instrumentId],
    references: [instruments.id],
  }),
}));

// ============================================================================
// PRICE SNAPSHOTS
// ============================================================================

export const priceSnapshots = pgTable(
  'price_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    instrumentId: uuid('instrument_id')
      .notNull()
      .references(() => instruments.id, { onDelete: 'cascade' }),
    price: numeric('price', { precision: 20, scale: 8 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
    source: varchar('source', { length: 50 }).notNull(),
    snapshotAt: timestamp('snapshot_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    instrumentIdIdx: index('idx_price_snapshots_instrument_id').on(table.instrumentId),
    instrumentTimeIdx: index('idx_price_snapshots_instrument_time').on(
      table.instrumentId,
      table.snapshotAt
    ),
    snapshotAtIdx: index('idx_price_snapshots_snapshot_at').on(table.snapshotAt),
    instrumentTimeUnique: uniqueIndex('uq_price_snapshots_instrument_time').on(
      table.instrumentId,
      table.snapshotAt
    ),
  })
);

// Relations
export const priceSnapshotsRelations = relations(priceSnapshots, ({ one }) => ({
  instrument: one(instruments, {
    fields: [priceSnapshots.instrumentId],
    references: [instruments.id],
  }),
}));

// ============================================================================
// EXCHANGE RATES
// ============================================================================

export const exchangeRates = pgTable(
  'exchange_rates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fromCurrency: varchar('from_currency', { length: 3 }).notNull(),
    toCurrency: varchar('to_currency', { length: 3 }).notNull(),
    rate: numeric('rate', { precision: 20, scale: 10 }).notNull(),
    validFrom: timestamp('valid_from', { withTimezone: true }).notNull(),
    source: varchar('source', { length: 50 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    currenciesIdx: index('idx_exchange_rates_currencies').on(
      table.fromCurrency,
      table.toCurrency,
      table.validFrom
    ),
    validFromIdx: index('idx_exchange_rates_valid_from').on(table.validFrom),
    currenciesTimeUnique: uniqueIndex('uq_exchange_rates_currencies_time').on(
      table.fromCurrency,
      table.toCurrency,
      table.validFrom
    ),
  })
);

// ============================================================================
// INSTRUMENT GROUPS
// ============================================================================

export const instrumentGroups = pgTable(
  'instrument_groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    portfolioId: uuid('portfolio_id')
      .notNull()
      .references(() => portfolios.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    color: varchar('color', { length: 7 }), // Hex color
    icon: varchar('icon', { length: 50 }),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    portfolioIdIdx: index('idx_instrument_groups_portfolio_id').on(table.portfolioId),
    portfolioNameUnique: uniqueIndex('uq_instrument_groups_portfolio_name').on(
      table.portfolioId,
      table.name
    ),
  })
);

// Relations
export const instrumentGroupsRelations = relations(instrumentGroups, ({ one, many }) => ({
  portfolio: one(portfolios, {
    fields: [instrumentGroups.portfolioId],
    references: [portfolios.id],
  }),
  assignments: many(instrumentGroupAssignments),
}));

// ============================================================================
// INSTRUMENT GROUP ASSIGNMENTS
// ============================================================================

export const instrumentGroupAssignments = pgTable(
  'instrument_group_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    instrumentId: uuid('instrument_id')
      .notNull()
      .references(() => instruments.id, { onDelete: 'cascade' }),
    groupId: uuid('group_id')
      .notNull()
      .references(() => instrumentGroups.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    instrumentIdIdx: index('idx_instrument_group_assignments_instrument').on(table.instrumentId),
    groupIdIdx: index('idx_instrument_group_assignments_group').on(table.groupId),
    instrumentGroupUnique: uniqueIndex('uq_instrument_group_assignments').on(
      table.instrumentId,
      table.groupId
    ),
  })
);

// Relations
export const instrumentGroupAssignmentsRelations = relations(
  instrumentGroupAssignments,
  ({ one }) => ({
    instrument: one(instruments, {
      fields: [instrumentGroupAssignments.instrumentId],
      references: [instruments.id],
    }),
    group: one(instrumentGroups, {
      fields: [instrumentGroupAssignments.groupId],
      references: [instrumentGroups.id],
    }),
  })
);

// ============================================================================
// AUDIT LOGS
// ============================================================================

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: uuid('entity_id').notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    oldValues: jsonb('old_values'),
    newValues: jsonb('new_values'),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('idx_audit_logs_user_id').on(table.userId),
    entityIdx: index('idx_audit_logs_entity').on(table.entityType, table.entityId),
    createdAtIdx: index('idx_audit_logs_created_at').on(table.createdAt),
    actionIdx: index('idx_audit_logs_action').on(table.action),
  })
);

// Relations
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS (for use in application)
// ============================================================================

// Select Types (what you get from SELECT queries)
export type User = typeof users.$inferSelect;
export type Portfolio = typeof portfolios.$inferSelect;
export type Instrument = typeof instruments.$inferSelect;
export type Trade = typeof trades.$inferSelect;
export type Position = typeof positions.$inferSelect;
export type PriceSnapshot = typeof priceSnapshots.$inferSelect;
export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type InstrumentGroup = typeof instrumentGroups.$inferSelect;
export type InstrumentGroupAssignment = typeof instrumentGroupAssignments.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;

// Insert Types (what you pass to INSERT queries)
export type NewUser = typeof users.$inferInsert;
export type NewPortfolio = typeof portfolios.$inferInsert;
export type NewInstrument = typeof instruments.$inferInsert;
export type NewTrade = typeof trades.$inferInsert;
export type NewPosition = typeof positions.$inferInsert;
export type NewPriceSnapshot = typeof priceSnapshots.$inferInsert;
export type NewExchangeRate = typeof exchangeRates.$inferInsert;
export type NewInstrumentGroup = typeof instrumentGroups.$inferInsert;
export type NewInstrumentGroupAssignment = typeof instrumentGroupAssignments.$inferInsert;
export type NewAuditLog = typeof auditLogs.$inferInsert;
