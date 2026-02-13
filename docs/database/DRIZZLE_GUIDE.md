# 🗄️ Database Setup with Drizzle ORM

## 🚀 Quick Start (Vercel Deployment)

### 1. Create Vercel Postgres Database

```bash
# In Vercel Dashboard:
# Settings → Storage → Create Database → Postgres
# Region: Frankfurt (fra1)
```

### 2. Deploy to Vercel

```bash
git add .
git commit -m "feat: Add Drizzle ORM schema"
git push origin main
```

Vercel will automatically:
- Install `drizzle-orm` and `@vercel/postgres`
- Use environment variables from Postgres database
- Build and deploy

### 3. Run Migrations on Vercel

```bash
# Option A: Use existing SQL schema
vercel env pull .env.local
psql $POSTGRES_URL -f db/schema.sql

# Option B: Use Drizzle Kit (wenn lokal installiert)
pnpm db:push
```

---

## 📦 Package Setup

Already installed in `package.json`:
```json
{
  "dependencies": {
    "drizzle-orm": "^0.45.1",
    "@vercel/postgres": "^0.10.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.x.x"  // On Vercel only
  }
}
```

---

## 🏗️ Project Structure

```
db/
├── schema.ts           # ⭐ Drizzle ORM Schema (TypeScript)
├── index.ts            # Database client exports
├── schema.sql          # SQL schema (fallback)
├── seed.sql            # Sample data
└── migrations/         # Generated migrations (if using drizzle-kit)
```

---

## 💻 Using Drizzle in Your App

### 1. Import Database Client

```typescript
import { db } from '@/db';
import { users, portfolios, trades, positions } from '@/db/schema';
```

### 2. Query Examples

#### SELECT - Get all portfolios for a user
```typescript
import { eq } from 'drizzle-orm';

const userPortfolios = await db
  .select()
  .from(portfolios)
  .where(eq(portfolios.userId, userId));
```

#### SELECT with JOIN - Get positions with instrument details
```typescript
import { eq, and } from 'drizzle-orm';

const openPositions = await db
  .select({
    position: positions,
    instrument: instruments,
  })
  .from(positions)
  .innerJoin(instruments, eq(positions.instrumentId, instruments.id))
  .where(
    and(
      eq(positions.portfolioId, portfolioId),
      eq(positions.isClosed, false)
    )
  );
```

#### INSERT - Create a new trade
```typescript
const newTrade = await db
  .insert(trades)
  .values({
    portfolioId,
    instrumentId,
    tradeType: 'BUY',
    quantity: '10.5',
    pricePerUnit: '125.50',
    totalAmount: '1318.25',
    fees: '5.00',
    currency: 'EUR',
    executedAt: new Date(),
  })
  .returning();
```

#### UPDATE - Update position
```typescript
await db
  .update(positions)
  .set({
    totalQuantity: '25.5',
    avgBuyPrice: '120.00',
    updatedAt: new Date(),
  })
  .where(eq(positions.id, positionId));
```

#### DELETE - Soft delete instrument
```typescript
await db
  .update(instruments)
  .set({ isActive: false })
  .where(eq(instruments.id, instrumentId));
```

### 3. Complex Queries with SQL

```typescript
import { sql } from '@/db';

// Get latest price for each instrument
const latestPrices = await db.execute(sql`
  SELECT DISTINCT ON (instrument_id)
    instrument_id,
    price,
    snapshot_at
  FROM ${priceSnapshots}
  ORDER BY instrument_id, snapshot_at DESC
`);
```

### 4. Transactions

```typescript
import { db } from '@/db';

await db.transaction(async (tx) => {
  // Insert trade
  const [trade] = await tx.insert(trades).values(newTrade).returning();
  
  // Update position
  await tx
    .update(positions)
    .set({ totalQuantity: updatedQuantity })
    .where(eq(positions.instrumentId, trade.instrumentId));
});
```

---

## 📊 TypeScript Types

All types are automatically inferred from the schema:

```typescript
import type { User, Portfolio, Trade, Position } from '@/db';

// For inserts (some fields optional/have defaults)
import type { NewTrade, NewPosition } from '@/db';

// Example function
async function createTrade(trade: NewTrade): Promise<Trade> {
  const [newTrade] = await db.insert(trades).values(trade).returning();
  return newTrade;
}
```

---

## 🔧 Database Operations

### Generate Migrations (if using drizzle-kit)

```bash
# Generate migration from schema changes
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Push schema directly to DB (no migrations)
pnpm db:push
```

### Seed Database

```bash
# Using SQL seed file
psql $POSTGRES_URL -f db/seed.sql

# Or create TypeScript seed script
pnpm db:seed
```

---

## 🎯 Key Indexes (Already in Schema)

### Critical for Performance:

1. **Portfolios**
   - `userId` - Fast user portfolio lookup
   - `(userId, name)` - Unique constraint + fast search

2. **Instruments**
   - `isin` - **Unique** - Primary lookup
   - `symbol` - Search/autocomplete
   - `currency` - Filter by currency

3. **Trades**
   - `portfolioId` - User's trades
   - `instrumentId` - Instrument history
   - `executedAt` - Time-series queries
   - `(portfolioId, executedAt)` - **Composite** - Dashboard queries

4. **Positions**
   - `(portfolioId, instrumentId)` - **Unique** - One position per instrument
   - `portfolioId` - User positions
   - `isClosed` - Open vs closed positions

5. **Price Snapshots**
   - `(instrumentId, snapshotAt)` - **Unique** - No duplicate prices
   - `instrumentId` - All prices for instrument
   - `snapshotAt` - Time-series queries

---

## 🔍 Query Optimization Tips

### 1. Use Indexes for WHERE clauses
```typescript
// Good - uses idx_positions_portfolio_id
const positions = await db
  .select()
  .from(positions)
  .where(eq(positions.portfolioId, portfolioId));
```

### 2. Lateral Joins for Latest Price
```typescript
// Efficient - gets latest price in one query
const positionsWithPrice = await db
  .select({
    position: positions,
    latestPrice: sql<number>`(
      SELECT price FROM ${priceSnapshots}
      WHERE instrument_id = ${positions.instrumentId}
      ORDER BY snapshot_at DESC
      LIMIT 1
    )`,
  })
  .from(positions)
  .where(eq(positions.portfolioId, portfolioId));
```

### 3. Batch Operations
```typescript
// Insert multiple trades at once
await db.insert(trades).values([trade1, trade2, trade3]);
```

---

## 🚨 Important Notes

### NUMERIC Precision
```typescript
// Drizzle returns NUMERIC as strings to preserve precision
const quantity: string = position.totalQuantity;

// Convert to Decimal.js for calculations
import { Decimal } from 'decimal.js';
const quantityDecimal = new Decimal(position.totalQuantity);
```

### Immutable Trades
```typescript
// ❌ DON'T update trades
await db.update(trades).set({ quantity: '11' }).where(eq(trades.id, id));

// ✅ DO insert new trade
await db.insert(trades).values(correctionTrade);
```

### Position Consistency
```typescript
// Always update positions after trade changes
async function createTradeAndUpdatePosition(trade: NewTrade) {
  await db.transaction(async (tx) => {
    await tx.insert(trades).values(trade);
    await recalculatePosition(tx, trade.portfolioId, trade.instrumentId);
  });
}
```

---

## 📚 Resources

- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Vercel Postgres Docs](https://vercel.com/docs/storage/vercel-postgres)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

---

## ✅ Schema Summary

| Table | Primary Key | Unique Indexes | Foreign Keys | Purpose |
|-------|-------------|----------------|--------------|---------|
| `users` | `id` (UUID) | `email` | - | Authentication |
| `portfolios` | `id` (UUID) | `(userId, name)` | `userId` → users | Multi-portfolio |
| `instruments` | `id` (UUID) | `isin` | - | Stock master data |
| `trades` | `id` (UUID) | - | `portfolioId`, `instrumentId` | Transaction log |
| `positions` | `id` (UUID) | `(portfolioId, instrumentId)` | `portfolioId`, `instrumentId` | Aggregated positions |
| `price_snapshots` | `id` (UUID) | `(instrumentId, snapshotAt)` | `instrumentId` | Historical prices |
| `exchange_rates` | `id` (UUID) | `(fromCurrency, toCurrency, validFrom)` | - | FX rates |
| `instrument_groups` | `id` (UUID) | `(portfolioId, name)` | `portfolioId` | User tags |
| `instrument_group_assignments` | `id` (UUID) | `(instrumentId, groupId)` | `instrumentId`, `groupId` | Group membership |
| `audit_logs` | `id` (UUID) | - | `userId` | Audit trail |

---

**Ready for Vercel Deployment!** 🚀

Das Schema ist vollständig typsicher, performant und produktionsreif.
