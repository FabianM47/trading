# 🗄️ Database Setup & Migrations

## Quick Start

### 1. Local Development (PostgreSQL)

```bash
# Install PostgreSQL 14+ locally or use Docker
docker run --name trading-postgres \
  -e POSTGRES_PASSWORD=dev_password \
  -e POSTGRES_DB=trading_dev \
  -p 5432:5432 \
  -d postgres:16-alpine

# Run schema
psql -h localhost -U postgres -d trading_dev -f db/schema.sql

# Seed with sample data
psql -h localhost -U postgres -d trading_dev -f db/seed.sql
```

### 2. Vercel Postgres

```bash
# Create database in Vercel Dashboard
# Settings → Storage → Create Database → Postgres

# Get connection string
vercel env pull .env.local

# Run migrations via Vercel CLI
psql $POSTGRES_URL -f db/schema.sql
```

---

## 📁 Files

```
db/
├── DATABASE_DESIGN.md    # Complete ER diagram & design decisions
├── schema.sql            # Full database schema (DDL)
├── seed.sql              # Sample data for development
└── migrations/           # Future migrations (versioned)
    └── 001_initial_schema.sql
```

---

## 🏗️ Schema Overview

### Core Tables
- **users** - User accounts & authentication
- **portfolios** - User portfolios (multi-portfolio support)
- **instruments** - Financial instruments (stocks, ETFs)
- **trades** - Immutable transaction log
- **positions** - Aggregated positions (materialized view)
- **price_snapshots** - Historical price data
- **exchange_rates** - Multi-currency support
- **instrument_groups** - User-defined tags/categories
- **audit_logs** - Audit trail

### Features
✅ UUID primary keys
✅ Automatic `updated_at` triggers
✅ Row Level Security (RLS) ready
✅ Comprehensive indexes
✅ Check constraints for data integrity
✅ JSONB for flexible metadata
✅ Multi-currency support
✅ Soft deletes via `is_active`

---

## 🔍 Verification

```sql
-- Check tables
\dt

-- Count records
SELECT 
  'users' as table_name, COUNT(*) FROM users
UNION ALL
SELECT 'portfolios', COUNT(*) FROM portfolios
UNION ALL
SELECT 'instruments', COUNT(*) FROM instruments
UNION ALL
SELECT 'trades', COUNT(*) FROM trades
UNION ALL
SELECT 'positions', COUNT(*) FROM positions
UNION ALL
SELECT 'price_snapshots', COUNT(*) FROM price_snapshots;

-- Test portfolio summary
SELECT 
  p.name as portfolio,
  COUNT(DISTINCT pos.instrument_id) as instruments,
  SUM(pos.total_invested) as invested,
  SUM(pos.realized_pnl) as realized_pnl
FROM portfolios p
LEFT JOIN positions pos ON p.id = pos.portfolio_id
WHERE pos.is_closed = false
GROUP BY p.id, p.name;
```

---

## 🔄 Migration Strategy

### Development
- Run `schema.sql` to create all tables
- Run `seed.sql` for sample data
- Reset: Drop database and recreate

### Production
1. Create versioned migration files in `migrations/`
2. Use migration tool (e.g., `node-pg-migrate`, `dbmate`, or custom)
3. Track applied migrations in `schema_migrations` table
4. Never modify existing migrations
5. Always create new migration for changes

### Example Migration Tool Setup

```bash
# Install node-pg-migrate
pnpm add -D node-pg-migrate

# Create migration
pnpm migrate create add-dividends-table

# Run migrations
pnpm migrate up

# Rollback
pnpm migrate down
```

---

## 📊 Performance Tips

### 1. Indexes
All critical queries have indexes. Check query plans:
```sql
EXPLAIN ANALYZE
SELECT * FROM positions WHERE portfolio_id = '...' AND is_closed = false;
```

### 2. Partitioning
For `price_snapshots` with > 1M rows:
```sql
-- Monthly partitions
CREATE TABLE price_snapshots_2026_02 
  PARTITION OF price_snapshots
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

### 3. Materialized Views
For expensive dashboard queries:
```sql
CREATE MATERIALIZED VIEW portfolio_summary AS
SELECT ...;

-- Refresh daily via cron
REFRESH MATERIALIZED VIEW CONCURRENTLY portfolio_summary;
```

### 4. Connection Pooling
Use PgBouncer or Vercel's built-in pooling:
```typescript
// Use POSTGRES_URL_NON_POOLING for migrations
// Use POSTGRES_URL for app queries
```

---

## 🔐 Security

### Row Level Security
```sql
-- Enable RLS
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own portfolios
CREATE POLICY portfolio_isolation ON portfolios
  FOR ALL
  USING (user_id = current_setting('app.current_user_id')::uuid);
```

**Note:** RLS requires setting session variables. With connection pooling, implement in application layer instead.

### Backup Strategy
```bash
# Backup
pg_dump -h localhost -U postgres trading_dev > backup.sql

# Restore
psql -h localhost -U postgres trading_dev < backup.sql
```

---

## 🧪 Testing

### Unit Tests (Domain Logic)
Test calculations in TypeScript, not SQL

### Integration Tests (Database)
```typescript
// Use separate test database
process.env.DATABASE_URL = 'postgresql://localhost/trading_test';

// Reset before each test
beforeEach(async () => {
  await db.query('TRUNCATE TABLE trades, positions, portfolios CASCADE');
});
```

---

## 📐 Data Types

### NUMERIC vs DECIMAL
- Use `NUMERIC(20,8)` for:
  - Prices (max 99,999,999,999.99999999)
  - Quantities
  - Amounts
- Avoids floating-point errors
- Exact decimal representation

### TIMESTAMP WITH TIME ZONE
- Always use `TIMESTAMP WITH TIME ZONE`
- Store in UTC, convert in application
- Postgres handles timezone conversions

### UUID
- Default: `uuid_generate_v4()`
- Distributed-friendly
- No auto-increment issues

---

## 🔄 Data Consistency

### Positions Table
`positions` is a cache/materialized view of `trades` aggregations.

**Sync strategies:**
1. **Trigger-based** (immediate):
```sql
CREATE TRIGGER update_position_after_trade
AFTER INSERT ON trades
FOR EACH ROW
EXECUTE FUNCTION recalculate_position();
```

2. **Application-based** (recommended):
```typescript
// In trade.service.ts
async createTrade(trade: Trade) {
  await db.trades.insert(trade);
  await updatePosition(trade.portfolio_id, trade.instrument_id);
}
```

3. **Scheduled Job** (daily consistency check):
```typescript
// Cron job: Rebuild all positions from trades
async rebuildPositions() {
  // Recalculate from trades table
}
```

---

## 📚 Sample Queries

See `DATABASE_DESIGN.md` for:
- Dashboard summary query
- Monthly profit calculation
- Instrument search
- Position with unrealized P&L

---

## 🚀 Next Steps

1. ✅ Schema designed & documented
2. ✅ SQL scripts created
3. ⏳ TypeScript types from schema (Prisma/Drizzle)
4. ⏳ Repository layer implementation
5. ⏳ Domain models & calculations
6. ⏳ Seed data for tests

---

**Ready for implementation!** 🎯
