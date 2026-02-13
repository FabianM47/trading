# 🗄️ Datenbank-Schema Design - Trading Portfolio App

## 📊 Entity-Relationship Diagram (Textform)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           DATABASE SCHEMA                                │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│ users                │
├──────────────────────┤
│ PK id               │ UUID
│    email            │ VARCHAR(255) UNIQUE NOT NULL
│    password_hash    │ VARCHAR(255) NOT NULL
│    name             │ VARCHAR(255)
│    totp_secret      │ VARCHAR(255) NULL (für 2FA)
│    totp_enabled     │ BOOLEAN DEFAULT false
│    default_currency │ VARCHAR(3) DEFAULT 'EUR'
│    created_at       │ TIMESTAMP DEFAULT NOW()
│    updated_at       │ TIMESTAMP DEFAULT NOW()
│    last_login_at    │ TIMESTAMP NULL
└──────────────────────┘
         │
         │ 1
         │
         │ N
         ▼
┌──────────────────────┐
│ portfolios           │  ← Optional: Multi-Portfolio Support
├──────────────────────┤
│ PK id               │ UUID
│ FK user_id          │ UUID → users.id
│    name             │ VARCHAR(255) NOT NULL
│    description      │ TEXT
│    is_default       │ BOOLEAN DEFAULT false
│    currency         │ VARCHAR(3) DEFAULT 'EUR'
│    created_at       │ TIMESTAMP DEFAULT NOW()
│    updated_at       │ TIMESTAMP DEFAULT NOW()
├──────────────────────┤
│ UNIQUE (user_id, name)
│ INDEX idx_portfolios_user_id (user_id)
└──────────────────────┘
         │
         │ 1
         │
         │ N
         ▼
┌──────────────────────┐
│ instruments          │  ← Zentrale Aktien-Stammdaten
├──────────────────────┤
│ PK id               │ UUID
│    isin             │ VARCHAR(12) UNIQUE NOT NULL
│    symbol           │ VARCHAR(20) NOT NULL
│    name             │ VARCHAR(255) NOT NULL
│    exchange         │ VARCHAR(50) NOT NULL (z.B. 'XETRA', 'NASDAQ')
│    currency         │ VARCHAR(3) NOT NULL (ISO 4217: EUR, USD, etc.)
│    type             │ VARCHAR(50) DEFAULT 'STOCK' (STOCK, ETF, BOND, etc.)
│    country          │ VARCHAR(2) NULL (ISO 3166-1 alpha-2)
│    sector           │ VARCHAR(100) NULL
│    industry         │ VARCHAR(100) NULL
│    is_active        │ BOOLEAN DEFAULT true
│    metadata         │ JSONB NULL (für zusätzliche Daten)
│    created_at       │ TIMESTAMP DEFAULT NOW()
│    updated_at       │ TIMESTAMP DEFAULT NOW()
├──────────────────────┤
│ UNIQUE INDEX idx_instruments_isin (isin)
│ INDEX idx_instruments_symbol (symbol)
│ INDEX idx_instruments_currency (currency)
│ INDEX idx_instruments_exchange (exchange)
│ GIN INDEX idx_instruments_metadata (metadata) ← für JSON Queries
└──────────────────────┘
         │                                   │
         │ 1                                 │ 1
         │                                   │
         │ N                                 │ N
         ▼                                   ▼
┌──────────────────────┐            ┌──────────────────────┐
│ trades               │            │ price_snapshots      │  ← Historische Kurse
├──────────────────────┤            ├──────────────────────┤
│ PK id               │ UUID       │ PK id               │ UUID
│ FK portfolio_id     │ UUID       │ FK instrument_id    │ UUID → instruments.id
│ FK instrument_id    │ UUID       │    price            │ NUMERIC(20,8) NOT NULL
│    trade_type       │ VARCHAR(10)│    currency         │ VARCHAR(3) NOT NULL
│    quantity         │ NUMERIC    │    source           │ VARCHAR(50) (API source)
│    price_per_unit   │ NUMERIC    │    snapshot_at      │ TIMESTAMP NOT NULL
│    total_amount     │ NUMERIC    │    created_at       │ TIMESTAMP DEFAULT NOW()
│    fees             │ NUMERIC    ├──────────────────────┤
│    currency         │ VARCHAR(3) │ UNIQUE INDEX idx_price_snapshots_unique
│    exchange_rate    │ NUMERIC    │   (instrument_id, snapshot_at)
│    notes            │ TEXT       │ INDEX idx_price_snapshots_instrument
│    executed_at      │ TIMESTAMP  │   (instrument_id, snapshot_at DESC)
│    created_at       │ TIMESTAMP  └──────────────────────┘
│    updated_at       │ TIMESTAMP                 │
├──────────────────────┤                          │
│ CHECK (trade_type IN ('BUY', 'SELL'))           │
│ CHECK (quantity > 0)                            │
│ CHECK (price_per_unit > 0)                      │
│ CHECK (total_amount > 0)                        │
│ CHECK (fees >= 0)                               │
│ INDEX idx_trades_portfolio (portfolio_id)       │
│ INDEX idx_trades_instrument (instrument_id)     │
│ INDEX idx_trades_executed_at (executed_at DESC) │
│ INDEX idx_trades_type (trade_type)              │
└──────────────────────┘                          │
         │                                        │
         │                                        │
         │                                        │
         ▼                                        │
┌──────────────────────┐                         │
│ positions            │  ← Materialisierte View (Performance)
├──────────────────────┤
│ PK id               │ UUID
│ FK portfolio_id     │ UUID → portfolios.id
│ FK instrument_id    │ UUID → instruments.id
│    total_quantity   │ NUMERIC(20,8) NOT NULL
│    avg_buy_price    │ NUMERIC(20,8) NOT NULL  ← Average Cost Basis
│    total_invested   │ NUMERIC(20,8) NOT NULL  ← Inkl. Fees
│    realized_pnl     │ NUMERIC(20,8) DEFAULT 0 ← Realisierte Gewinne
│    total_fees       │ NUMERIC(20,8) DEFAULT 0
│    first_buy_at     │ TIMESTAMP NOT NULL
│    last_trade_at    │ TIMESTAMP NOT NULL
│    is_closed        │ BOOLEAN DEFAULT false
│    closed_at        │ TIMESTAMP NULL
│    currency         │ VARCHAR(3) NOT NULL
│    updated_at       │ TIMESTAMP DEFAULT NOW()
├──────────────────────┤
│ UNIQUE (portfolio_id, instrument_id)
│ INDEX idx_positions_portfolio (portfolio_id)
│ INDEX idx_positions_instrument (instrument_id)
│ INDEX idx_positions_is_closed (is_closed)
│ CHECK (total_quantity >= 0)
│ CHECK (avg_buy_price >= 0)
└──────────────────────┘
         │
         │
         │
         ▼
┌──────────────────────┐
│ instrument_groups    │  ← Gruppen/Tags (z.B. "Tech", "Dividenden")
├──────────────────────┤
│ PK id               │ UUID
│ FK portfolio_id     │ UUID → portfolios.id (user-spezifisch!)
│    name             │ VARCHAR(100) NOT NULL
│    color           │ VARCHAR(7) NULL (Hex-Color für UI)
│    icon            │ VARCHAR(50) NULL
│    description     │ TEXT
│    created_at      │ TIMESTAMP DEFAULT NOW()
├──────────────────────┤
│ UNIQUE (portfolio_id, name)
│ INDEX idx_groups_portfolio (portfolio_id)
└──────────────────────┘
         │
         │ 1
         │
         │ N (Many-to-Many)
         ▼
┌──────────────────────┐
│ instrument_group_    │  ← Join Table für Instrument-Gruppen
│ assignments          │
├──────────────────────┤
│ PK id               │ UUID
│ FK instrument_id    │ UUID → instruments.id
│ FK group_id         │ UUID → instrument_groups.id
│    assigned_at      │ TIMESTAMP DEFAULT NOW()
├──────────────────────┤
│ UNIQUE (instrument_id, group_id)
│ INDEX idx_assignments_instrument (instrument_id)
│ INDEX idx_assignments_group (group_id)
└──────────────────────┘


┌──────────────────────┐
│ exchange_rates       │  ← Währungsumrechnung für Multi-Currency
├──────────────────────┤
│ PK id               │ UUID
│    from_currency    │ VARCHAR(3) NOT NULL
│    to_currency      │ VARCHAR(3) NOT NULL
│    rate             │ NUMERIC(20,10) NOT NULL
│    valid_from       │ TIMESTAMP NOT NULL
│    source           │ VARCHAR(50) (z.B. 'ECB', 'Manual')
│    created_at       │ TIMESTAMP DEFAULT NOW()
├──────────────────────┤
│ UNIQUE INDEX idx_exchange_rates_unique
│   (from_currency, to_currency, valid_from)
│ INDEX idx_exchange_rates_currencies
│   (from_currency, to_currency, valid_from DESC)
└──────────────────────┘


┌──────────────────────┐
│ audit_logs           │  ← Für Compliance & Debugging
├──────────────────────┤
│ PK id               │ UUID
│ FK user_id          │ UUID → users.id
│    entity_type      │ VARCHAR(50) (z.B. 'trade', 'position')
│    entity_id        │ UUID
│    action           │ VARCHAR(50) (CREATE, UPDATE, DELETE)
│    old_values       │ JSONB NULL
│    new_values       │ JSONB NULL
│    ip_address       │ INET NULL
│    user_agent       │ TEXT NULL
│    created_at       │ TIMESTAMP DEFAULT NOW()
├──────────────────────┤
│ INDEX idx_audit_logs_user (user_id)
│ INDEX idx_audit_logs_entity (entity_type, entity_id)
│ INDEX idx_audit_logs_created_at (created_at DESC)
└──────────────────────┘
```

---

## 🎯 Wichtige Design-Entscheidungen & Begründungen

### 1. **`portfolios` Tabelle (Optional aber empfohlen)**

**Begründung:**
- Ermöglicht **Multi-Portfolio Support** (z.B. "Langfristig", "Trading", "Altersvorsorge")
- User kann verschiedene Strategien getrennt tracken
- Einfachere Erweiterung später
- Wenn nicht benötigt: Kann mit `user_id` direkt verknüpft werden

**Alternative:** Ohne `portfolios` → `trades` direkt mit `user_id` verknüpfen

---

### 2. **`instruments` - Zentrale Stammdatenverwaltung**

**Begründung:**
- **Ein Instrument = Eine Datenquelle**
- Vermeidet Duplizierung von Stammdaten
- ISIN als eindeutiger Identifier (international standardisiert)
- Symbol für schnelle Suche (nicht unique, da gleiche Symbole auf verschiedenen Börsen)
- `is_active` für soft-delete (historische Trades bleiben erhalten)
- `metadata` JSONB für flexible Erweiterungen ohne Schema-Migration

**Index-Strategie:**
- ISIN: Unique Index (primary lookup)
- Symbol: Index für Suche
- Currency: Filter nach Währung
- JSONB GIN Index: Für flexible Queries auf Metadaten

---

### 3. **`trades` - Immutable Transaction Log**

**Begründung:**
- **Immutable = Keine Updates nach Erstellung** (nur Soft-Delete wenn nötig)
- Jeder Trade ist eine atomare Transaktion
- `trade_type`: BUY oder SELL (klar und einfach)
- **Redundante Speicherung von `total_amount`**:
  - Verhindert Rundungsfehler bei Rückberechnung
  - `total_amount = quantity × price_per_unit + fees`
  - Datenbank-Constraints prüfen Konsistenz
- `exchange_rate`: Gespeichert zum Zeitpunkt des Trades (wichtig für Historie!)
- `executed_at`: Wann der Trade tatsächlich ausgeführt wurde (≠ created_at)

**Wichtige Felder:**
```sql
quantity:        NUMERIC(20,8)  -- Max 99,999,999,999.99999999 Stück
price_per_unit:  NUMERIC(20,8)  -- Präzise Preisangabe
total_amount:    NUMERIC(20,8)  -- Gesamtbetrag
fees:            NUMERIC(20,8)  -- Transaktionsgebühren
exchange_rate:   NUMERIC(20,10) -- Wechselkurs (falls benötigt)
```

**Checks:**
- `quantity > 0` (auch bei SELL positiv, Richtung durch trade_type)
- `price_per_unit > 0`
- `total_amount > 0`
- `fees >= 0`

---

### 4. **`positions` - Materialisierte Aggregation**

**Begründung:**
- **Performance**: Aggregation von Trades ist teuer bei vielen Einträgen
- Vorberechnete Werte für schnelle Abfragen
- **Average Cost Basis** (Durchschnittspreis) gespeichert
- `realized_pnl`: Summe aller realisierten Gewinne/Verluste
- `is_closed`: Position vollständig verkauft?

**Update-Strategie:**
1. Bei neuem Trade → Trigger oder Application Logic aktualisiert `positions`
2. Alternative: Scheduled Job (täglich) für Konsistenz-Check

**Berechnung Average Cost Basis:**
```
Bei BUY:
  new_avg = (current_avg × current_qty + buy_price × buy_qty) / (current_qty + buy_qty)

Bei SELL:
  realized_pnl += (sell_price - avg_buy_price) × sell_qty - fees
  quantity -= sell_qty
```

**Wichtig:** `positions` ist eine **Cache-Tabelle** → Bei Inkonsistenzen aus `trades` neu berechnen!

---

### 5. **`price_snapshots` - Historische Kursdaten**

**Begründung:**
- **Zeitreihen-Daten** für Charts und historische Analysen
- Cron Job aktualisiert alle 15 Minuten
- `snapshot_at`: Zeitstempel des Kurses (nicht wann er gespeichert wurde!)
- `source`: Woher kommt der Kurs? (für Debugging)
- Unique Constraint verhindert Duplikate

**Index-Strategie:**
```sql
-- Schnellste Abfrage für letzten Kurs
CREATE INDEX idx_price_snapshots_latest 
  ON price_snapshots (instrument_id, snapshot_at DESC);

-- Zeitbereichs-Abfragen
CREATE INDEX idx_price_snapshots_range 
  ON price_snapshots (instrument_id, snapshot_at) 
  WHERE snapshot_at >= NOW() - INTERVAL '1 year';
```

**Partitionierung (später):**
```sql
-- Monatliche Partitionen für Performance
CREATE TABLE price_snapshots_2026_02 PARTITION OF price_snapshots
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

---

### 6. **`exchange_rates` - Multi-Currency Support**

**Begründung:**
- User handelt in USD, will aber EUR-Dashboard sehen
- Historische Wechselkurse für korrekte Gewinn/Verlust-Berechnung
- `valid_from`: Ab wann ist dieser Kurs gültig?
- Zeitreihen-Daten wie `price_snapshots`

**Verwendung:**
```sql
-- Aktueller EUR/USD Kurs
SELECT rate FROM exchange_rates
WHERE from_currency = 'EUR' 
  AND to_currency = 'USD'
  AND valid_from <= NOW()
ORDER BY valid_from DESC
LIMIT 1;
```

**Alternative:** Falls nur EUR → Tabelle vorerst leer lassen

---

### 7. **`instrument_groups` & `instrument_group_assignments`**

**Begründung:**
- **Many-to-Many Relationship** (Ein Instrument kann in mehreren Gruppen sein)
- User-spezifische Gruppen (mein "Tech-Portfolio" ist anders als deins)
- Flexibles Tagging-System
- `color` & `icon` für UI-Darstellung

**Beispiel-Gruppen:**
- "Tech Aktien"
- "Dividenden-Zahler"
- "Blue Chips"
- "Spekulative Werte"

---

### 8. **`audit_logs` - Compliance & Debugging**

**Begründung:**
- **Nachvollziehbarkeit** aller Änderungen
- Forensik bei Problemen
- Compliance-Anforderungen (wer hat was wann geändert?)
- JSONB für flexible Speicherung von Änderungen

---

## 📐 Normalisierung & Denormalisierung

### Normalisiert (3NF):
- ✅ `instruments` - Keine Redundanz
- ✅ `trades` - Immutable, keine Updates
- ✅ `users` - Zentrale User-Daten

### Bewusst Denormalisiert (Performance):
- ✅ `positions` - Aggregierte Daten (Cache)
- ✅ `trades.currency` - Redundant zu `instruments.currency` (historische Korrektheit!)
- ✅ `trades.exchange_rate` - Frozen-in-time für Berechnungen

---

## 🔍 Wichtige Queries & Indizes

### Query 1: Dashboard - Offene Positionen mit aktuellem Gewinn/Verlust
```sql
SELECT 
  p.id,
  i.symbol,
  i.name,
  p.total_quantity,
  p.avg_buy_price,
  p.total_invested,
  ps.price as current_price,
  (ps.price * p.total_quantity - p.total_invested) as unrealized_pnl,
  ((ps.price * p.total_quantity - p.total_invested) / p.total_invested * 100) as unrealized_pnl_pct
FROM positions p
JOIN instruments i ON p.instrument_id = i.id
JOIN LATERAL (
  SELECT price 
  FROM price_snapshots 
  WHERE instrument_id = p.instrument_id 
  ORDER BY snapshot_at DESC 
  LIMIT 1
) ps ON true
WHERE p.portfolio_id = $1 
  AND p.is_closed = false
ORDER BY unrealized_pnl DESC;
```

**Benötigte Indizes:**
- ✅ `idx_positions_portfolio` (portfolio_id)
- ✅ `idx_positions_is_closed` (is_closed)
- ✅ `idx_price_snapshots_latest` (instrument_id, snapshot_at DESC)

---

### Query 2: Monatsgewinn (nur positive Gewinne optional)
```sql
SELECT 
  DATE_TRUNC('month', t.executed_at) as month,
  SUM(
    CASE 
      WHEN t.trade_type = 'SELL' 
      THEN (t.price_per_unit - p.avg_buy_price) * t.quantity - t.fees
      ELSE 0
    END
  ) as realized_profit
FROM trades t
JOIN positions p ON t.portfolio_id = p.portfolio_id 
  AND t.instrument_id = p.instrument_id
WHERE t.portfolio_id = $1
  AND t.executed_at >= DATE_TRUNC('month', NOW())
  AND t.executed_at < DATE_TRUNC('month', NOW() + INTERVAL '1 month')
GROUP BY month
HAVING SUM(...) > 0  -- Optional: nur positive Monate
ORDER BY month DESC;
```

---

### Query 3: Instrument-Suche (Autocomplete)
```sql
SELECT 
  id, isin, symbol, name, exchange, currency
FROM instruments
WHERE 
  (symbol ILIKE $1 || '%' OR name ILIKE '%' || $1 || '%' OR isin ILIKE $1 || '%')
  AND is_active = true
ORDER BY 
  -- Exact match zuerst
  CASE WHEN symbol = UPPER($1) THEN 0 ELSE 1 END,
  -- Dann Symbol-Prefix
  CASE WHEN symbol ILIKE $1 || '%' THEN 0 ELSE 1 END,
  -- Dann Alphabetisch
  symbol
LIMIT 20;
```

**Benötigte Indizes:**
- ✅ `idx_instruments_symbol` (symbol)
- ✅ GIN Index für Full-Text Search (optional):
```sql
CREATE INDEX idx_instruments_search 
  ON instruments 
  USING GIN (to_tsvector('simple', symbol || ' ' || name || ' ' || isin));
```

---

## 🚀 Performance-Optimierungen

### 1. Partitionierung für `price_snapshots`
```sql
-- Nach Monat partitionieren (bei > 1M Einträgen)
CREATE TABLE price_snapshots (
  ...
) PARTITION BY RANGE (snapshot_at);

CREATE TABLE price_snapshots_2026_01 
  PARTITION OF price_snapshots
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

### 2. Materialized View für Dashboard-KPIs
```sql
CREATE MATERIALIZED VIEW portfolio_summary AS
SELECT 
  portfolio_id,
  COUNT(DISTINCT instrument_id) as total_instruments,
  SUM(total_invested) as total_invested,
  SUM(realized_pnl) as total_realized_pnl,
  -- ... weitere Aggregationen
FROM positions
WHERE is_closed = false
GROUP BY portfolio_id;

-- Refresh täglich via Cron
REFRESH MATERIALIZED VIEW CONCURRENTLY portfolio_summary;
```

### 3. Read Replicas für Reports
- Schwere Queries (z.B. Jahresberichte) auf Read Replica
- Schreiboperationen auf Primary

---

## 🔐 Sicherheit & Constraints

### Row Level Security (RLS) - PostgreSQL
```sql
-- User sieht nur eigene Portfolios
CREATE POLICY portfolio_isolation ON portfolios
  FOR ALL
  USING (user_id = current_setting('app.current_user_id')::uuid);

-- User sieht nur eigene Trades
CREATE POLICY trade_isolation ON trades
  FOR ALL
  USING (
    portfolio_id IN (
      SELECT id FROM portfolios 
      WHERE user_id = current_setting('app.current_user_id')::uuid
    )
  );
```

### Wichtige Constraints
```sql
-- Prevent negative quantities
ALTER TABLE positions 
  ADD CONSTRAINT chk_positions_quantity_positive 
  CHECK (total_quantity >= 0);

-- Trade type validation
ALTER TABLE trades 
  ADD CONSTRAINT chk_trades_type 
  CHECK (trade_type IN ('BUY', 'SELL'));

-- Currency validation (ISO 4217)
ALTER TABLE instruments 
  ADD CONSTRAINT chk_instruments_currency_iso 
  CHECK (LENGTH(currency) = 3);
```

---

## 🎯 Erweiterbarkeit

### Geplante Erweiterungen:
1. **Dividenden-Tracking**
```sql
CREATE TABLE dividends (
  id UUID PRIMARY KEY,
  instrument_id UUID REFERENCES instruments(id),
  portfolio_id UUID REFERENCES portfolios(id),
  amount NUMERIC(20,8) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  ex_date DATE NOT NULL,
  payment_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

2. **Watchlists**
```sql
CREATE TABLE watchlists (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  instrument_ids UUID[] NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

3. **Price Alerts**
```sql
CREATE TABLE price_alerts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  instrument_id UUID REFERENCES instruments(id),
  target_price NUMERIC(20,8) NOT NULL,
  condition VARCHAR(10) NOT NULL CHECK (condition IN ('ABOVE', 'BELOW')),
  is_triggered BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

4. **Orders (Limit Orders etc.)**
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  portfolio_id UUID REFERENCES portfolios(id),
  instrument_id UUID REFERENCES instruments(id),
  order_type VARCHAR(20) NOT NULL, -- MARKET, LIMIT, STOP_LOSS
  side VARCHAR(10) NOT NULL, -- BUY, SELL
  quantity NUMERIC(20,8) NOT NULL,
  limit_price NUMERIC(20,8),
  status VARCHAR(20) NOT NULL, -- PENDING, FILLED, CANCELLED
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 📝 Zusammenfassung: Warum dieses Design?

### ✅ Vorteile:
1. **Normalisiert wo sinnvoll** (keine Redundanz bei Stammdaten)
2. **Denormalisiert für Performance** (positions als Cache)
3. **Immutable Audit Trail** (trades sind unveränderlich)
4. **Multi-Currency Ready** (exchange_rates Tabelle)
5. **Historische Korrektheit** (Wechselkurse & Preise mit Timestamp)
6. **Flexible Erweiterung** (JSONB für Metadaten)
7. **Skalierbar** (Partitionierung vorbereitet)
8. **Sicher** (RLS, Constraints, Audit Logs)
9. **Performant** (Durchdachte Indizes, Materialized Views)

### ⚠️ Trade-offs:
1. **Positions Redundanz** → Konsistenz muss sichergestellt werden
2. **Mehr Tabellen** → Komplexere Queries
3. **Historische Daten** → Wachsende Datenmenge (aber partitionierbar)

### 🎯 Nächste Schritte:
1. SQL-Migrationsskripte erstellen
2. Seed-Daten für Development
3. Repository-Layer implementieren
4. Domain Models definieren

---

**Bereit für Review und Anpassungen!** 🚀
