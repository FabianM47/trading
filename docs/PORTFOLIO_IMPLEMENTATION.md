# 📊 Portfolio-Management System - Vollständige Implementierung

## 🎯 Übersicht

Vollständiges Portfolio-Management-System mit präzisen Berechnungen, umfassendem Dashboard und Trade-Management.

## 📐 Berechnungsregeln

### 1. Weighted Average Cost (Durchschnittlicher Einstand)

```
avgCost = Σ(buyPrice * quantity + fees) / Σ(quantity)
```

**Wichtig:** Gebühren bei Käufen werden zur Cost Basis hinzugefügt!

**Beispiel:**
- Kauf 1: 10 Stück à 100 EUR + 5 EUR Gebühren = 1.005 EUR
- Kauf 2: 5 Stück à 120 EUR + 3 EUR Gebühren = 603 EUR
- **avgCost = (1.005 + 603) / (10 + 5) = 1.608 / 15 = 107,20 EUR**

### 2. Unrealized P/L (Offene Position)

```
unrealizedPnL = (currentPrice - avgCost) * quantity
```

**Beispiel:**
- avgCost: 107,20 EUR (inkl. Gebühren), Quantity: 15, Current: 130 EUR
- **unrealizedPnL = (130 - 107,20) * 15 = +342 EUR**

### 3. Realized P/L (Average Cost Method)

```
realizedPnL = (sellPrice - avgCostAtSell) * quantitySold - fees
```

**Wichtig:** Gebühren bei Verkäufen werden vom P/L abgezogen!

**Entscheidung: Average Cost Method**
- ✅ Einfacher zu verstehen
- ✅ Steuerlich in Deutschland akzeptiert
- ✅ Weniger Tracking-Overhead als FIFO
- ✅ Entspricht Portfolio-Ansicht

**Beispiel:**
- avgCost: 107,20 EUR (inkl. Kaufgebühren), Verkauf: 5 Stück à 140 EUR, Gebühren: 10 EUR
- **realizedPnL = (140 - 107,20) * 5 - 10 = 164 - 10 = +154 EUR**

### 4. "Nur Gewinne" Summen

```
profitOnlyTotal = Σ(max(0, pnl))
```

**Beispiel:**
- Position A: +350 EUR → zählt
- Position B: -120 EUR → zählt NICHT
- Position C: +80 EUR → zählt
- **Total = 430 EUR**

**Gebühren-Behandlung:**
- **Bei BUY**: Gebühren werden zur Cost Basis addiert → erhöht avgCost
- **Bei SELL**: Gebühren werden vom P/L abgezogen → reduziert Gewinn

## 🗂 Dateistruktur

```
trading/
├── lib/
│   ├── portfolio/
│   │   ├── calculations.ts (550 Zeilen)
│   │   │   - buildPositionsFromTrades()
│   │   │   - computePnL()
│   │   │   - computeTotals()
│   │   │   - Formatierungs-Utilities
│   │   └── calculations.test.ts (450 Zeilen)
│   │       - Umfassende Tests für alle Edge Cases
│   └── utils.ts
│       - cn() für Tailwind-Klassen
│       - formatCurrency(), formatPercentage()
│
├── components/
│   ├── ui/
│   │   ├── KpiCard.tsx
│   │   │   - KPI-Karten mit Icon und Trend
│   │   │   - Compact-Variante
│   │   ├── PriceChip.tsx
│   │   │   - Preis-Anzeige mit Farbcodierung
│   │   │   - Trend-Icons (↑↓)
│   │   ├── PnlText.tsx
│   │   │   - P/L-Text mit automatischer Färbung
│   │   │   - Badge-Variante
│   │   └── HeaderIndices.tsx
│   │       - Marktindizes (DAX, S&P 500, etc.)
│   │       - Live-Updates optional
│   └── prices/
│       - LivePriceDisplay.tsx (bereits vorhanden)
│       - PortfolioLivePrices.tsx (bereits vorhanden)
│
├── app/
│   ├── dashboard-v2/
│   │   ├── page.tsx (Server Component)
│   │   │   - Lädt Trades aus DB
│   │   │   - Baut Positionen mit buildPositionsFromTrades()
│   │   │   - Lädt Gruppen
│   │   └── dashboard-client.tsx (Client Component)
│   │       - Marktindizes-Übersicht
│   │       - KPI-Karten (Monat/Gesamt Gewinn, Unrealized P/L)
│   │       - Positions-Tabelle mit TanStack Table
│   │       - Filter: Gruppen, Suche, Open/Closed
│   │       - URL Query Params für persistente Filter
│   │       - Live-Preis-Updates via SWR
│   │
│   ├── trades/
│   │   └── new/
│   │       ├── page.tsx (Server Component)
│   │       └── NewTradeForm.tsx (Client Component)
│   │           - Instrument-Suche mit Autocomplete
│   │           - Manuelle ISIN-Eingabe
│   │           - Preis-Eingabe
│   │           - Stückzahl ODER Betrag (auto-calc)
│   │           - Gebühren optional
│   │           - Datum/Uhrzeit
│   │           - Validation mit hilfreichen Fehlern
│   │           - Server Action Submission
│   │
│   ├── groups/
│   │   ├── page.tsx (Server Component)
│   │   └── groups-client.tsx (Client Component)
│   │       - Gruppen-Liste
│   │       - Erstellen mit Farbauswahl
│   │       - Bearbeiten/Löschen
│   │       - 10 vordefinierte Farben
│   │
│   └── actions/
│       ├── trades.ts
│       │   - createTrade() Server Action
│       │   - Zod Validation
│       │   - Instrument-Erstellung bei ISIN
│       └── groups.ts
│           - createGroup(), updateGroup(), deleteGroup()
│
└── docs/
    └── PORTFOLIO_IMPLEMENTATION.md (diese Datei)
```

## 🚀 Features

### Dashboard (`/dashboard-v2`)
- ✅ Marktindizes (DAX, S&P 500, Nasdaq, Euro Stoxx 50)
- ✅ KPI-Karten:
  - Monat Gewinn (nur+)
  - Gesamt Gewinn (nur+)
  - Unrealized P/L mit Prozent
  - Total P/L (Realized + Unrealized)
- ✅ Positions-Tabelle:
  - Sortierbar nach allen Spalten
  - Filter: Gruppen (Multi-Select)
  - Filter: Suche (Name, Symbol, ISIN)
  - Filter: Open/Closed Toggle
  - Farb-Badges für Gruppen
  - Live-Preise mit SWR (60s refresh)
  - P/L-Färbung (Grün/Rot)
- ✅ URL Query Params für persistente Filter
- ✅ Summary Footer mit Gesamtwerten

### Trade-Erstellung (`/trades/new`)
- ✅ Instrument-Suche mit Autocomplete
- ✅ Manuelle ISIN-Eingabe (Fallback)
- ✅ Smart Calculation: Stückzahl ↔ Betrag
- ✅ Gebühren optional
- ✅ Datum/Uhrzeit-Picker
- ✅ Validation mit präzisen Fehlermeldungen
- ✅ Server Action für sicheres Speichern
- ✅ Auto-Redirect zum Dashboard nach Erfolg

### Gruppenverwaltung (`/groups`)
- ✅ Gruppen-Liste mit Farbvorschau
- ✅ Erstellen mit Farbauswahl (10 Farben)
- ✅ Inline-Bearbeitung
- ✅ Löschen mit Bestätigung
- ✅ Server Actions für CRUD

## 🧮 Berechnungsfunktionen

### `buildPositionsFromTrades(trades, instrumentMeta)`
**Zweck:** Baut Positionen aus Trade-Historie mit Average Cost Method

**Algorithmus:**
1. Gruppiere Trades nach instrumentId
2. Sortiere chronologisch
3. Für BUY: Update totalCost = totalCost + (price * qty) + fees, dann avgCost = totalCost / quantity
4. Für SELL: Calc realized P/L = (sellPrice - avgCost) * sellQty - fees
5. Tracke alle Fees und Daten

**Returns:** `Map<instrumentId, Position>`

### `computePnL(position, currentPrice)`
**Zweck:** Berechnet P/L für eine Position bei gegebenem Marktpreis

**Berechnet:**
- currentValue = price * quantity
- unrealizedPnL = (price - avgCost) * quantity
- unrealizedPnLPercent = (price - avgCost) / avgCost * 100
- totalPnL = realizedPnL + unrealizedPnL
- totalPnLPercent = totalPnL / totalCost * 100

**Returns:** `PositionWithPrice`

### `computeTotals(positions, options)`
**Zweck:** Aggregiert Portfolio-Metriken

**Options:**
- `profitOnly`: Nur positive P/L zählen
- `openOnly`: Nur offene Positionen
- `closedOnly`: Nur geschlossene Positionen
- `dateFrom/dateTo`: Zeitraum-Filter
- `groupIds`: Gruppen-Filter

**Returns:** `PortfolioTotals`
- totalInvested, currentValue
- unrealizedPnL, realizedPnL, totalPnL
- profitOnlySum
- winningPositions, losingPositions
- returnPercent

## 🧪 Tests

**Datei:** `lib/portfolio/calculations.test.ts`

**Abgedeckte Edge Cases:**
- ✅ Weighted average mit mehreren Käufen
- ✅ Partial sells mit Average Cost
- ✅ Complete close (sell all)
- ✅ Multiple buys and sells gemischt
- ✅ Fees in allen Szenarien
- ✅ Dezimal-Präzision (keine Float-Fehler)
- ✅ Empty portfolios
- ✅ Multiple instruments parallel
- ✅ Closed positions (quantity = 0)
- ✅ Negative P/L
- ✅ Profit-only sums
- ✅ Date range filters

**Run Tests:**
```bash
pnpm test lib/portfolio/calculations.test.ts
```

## 🎨 UI-Komponenten

### KpiCard
```tsx
<KpiCard
  title="Monat Gewinn (nur+)"
  value={formatCurrency(1234.56)}
  icon={TrendingUp}
  trend="positive"
  change="+5.2%"
  subtitle="Letzte 30 Tage"
/>
```

### PriceChip
```tsx
<PriceChip
  price={130.45}
  currency="EUR"
  change={2.33}
  changePercent={1.82}
  showIcon={true}
  size="md"
/>
```

### PnlText
```tsx
<PnlText
  value={350.50}
  percent={23.5}
  showSign={true}
  size="lg"
  bold={true}
/>
```

### HeaderIndices
```tsx
<HeaderIndices />
// Zeigt: DAX, S&P 500, Nasdaq, Euro Stoxx 50
```

## 🔧 Installation & Setup

### 1. Dependencies installieren
```bash
pnpm add lucide-react clsx tailwind-merge @tanstack/react-table date-fns
```

**Bereits installiert:**
- decimal.js (Präzisionsarithmetik)
- swr (Live-Preis-Polling)
- zod (Validation)

### 2. Tests ausführen
```bash
pnpm test
```

### 3. Dashboard öffnen
```bash
pnpm dev
# Öffne: http://localhost:3000/dashboard-v2
```

## 📊 Datenbankschema

**Wichtig:** Das Schema verwendet:
- `trades.tradeType` (nicht `type`)
- `trades.pricePerUnit` (nicht `price`)
- `trades.quantity` als `numeric`

**Mapping für Calculation-Funktionen:**
```typescript
// Im Server Component (dashboard-v2/page.tsx):
const trades = allTrades.map((t) => ({
  ...t,
  type: t.tradeType as 'BUY' | 'SELL',
  price: parseFloat(t.pricePerUnit),
  quantity: parseFloat(t.quantity),
  fees: parseFloat(t.fees),
}));
```

## 🎯 Nächste Schritte

### Sofort einsatzbereit:
- ✅ Dashboard mit Live-Preisen
- ✅ Trade-Erstellung
- ✅ Gruppenverwaltung
- ✅ Filter-Persistierung via URL

### Optional (Erweiterungen):
- 📈 Historische Charts (chart.js oder recharts)
- 🔔 Price Alerts (Benachrichtigungen bei Schwellwerten)
- 📄 Export als PDF/Excel
- 📊 Performance-Analyse (Sharpe Ratio, etc.)
- 🔄 Bulk-Import von Trades (CSV)
- 📱 Mobile-Optimierung

## 🐛 Bekannte Limitierungen

1. **Indizes sind Fallback-Daten**: HeaderIndices zeigt statische Werte. Für echte Live-Daten müssen Instrument-IDs für Indizes erstellt werden.

2. **Schema-Mapping**: Die Calculation-Funktionen erwarten `type`, `price`, `quantity` als numbers. Das DB-Schema verwendet andere Namen und `numeric` type. Mapping im Server Component erforderlich.

3. **Keine FIFO-Option**: System verwendet ausschließlich Average Cost Method. Für steuerliche FIFO-Anforderungen müsste eine separate Implementierung erfolgen.

4. **Gruppenzuweisung**: Instrumente können Gruppen nur über die DB zugewiesen werden. UI für Instrument-Detail-Seite mit Gruppenzuweisung fehlt noch.

## 📚 Verwendete Libraries

| Library | Version | Zweck |
|---------|---------|-------|
| decimal.js | 10.6.0 | Präzise Dezimalrechnung |
| lucide-react | latest | Icons |
| @tanstack/react-table | latest | Tabellen mit Sortierung/Filterung |
| clsx + tailwind-merge | latest | Conditional Tailwind Classes |
| date-fns | latest | Datum-Formatierung |
| swr | 2.4.0 | Live-Preis-Polling |
| zod | latest | Schema-Validation |

## ✅ Vollständigkeits-Checkliste

- [x] Berechnungsregeln definiert mit Beispielen
- [x] buildPositionsFromTrades() implementiert
- [x] computePnL() implementiert
- [x] computeTotals() mit Filtern implementiert
- [x] Umfassende Tests (14 Test Cases)
- [x] UI-Komponenten (KpiCard, PriceChip, PnlText, HeaderIndices)
- [x] Dashboard mit Marktindizes
- [x] Dashboard mit KPIs
- [x] Dashboard mit Positions-Tabelle
- [x] Filter (Gruppen, Suche, Open/Closed)
- [x] URL Query Params
- [x] Trade-Erstellung mit Autocomplete
- [x] Trade-Erstellung mit Smart Calculation
- [x] Server Actions (Trades, Groups)
- [x] Gruppenverwaltung
- [x] Farbauswahl für Gruppen
- [x] Dokumentation

## 🎓 Code-Beispiele

### Position aus Trades berechnen:
```typescript
import { buildPositionsFromTrades } from '@/lib/portfolio/calculations';

const trades = [
  { id: '1', instrumentId: 'inst-1', type: 'BUY', quantity: 10, price: 100, fees: 5, ... },
  { id: '2', instrumentId: 'inst-1', type: 'SELL', quantity: 4, price: 130, fees: 2, ... },
];

const instrumentMeta = new Map([
  ['inst-1', { symbol: 'AAPL', isin: 'US0378331005', name: 'Apple Inc.' }]
]);

const positions = buildPositionsFromTrades(trades, instrumentMeta);
// positions.get('inst-1').avgCost === 100.5 (1005 / 10, Gebühren inkl.)
// positions.get('inst-1').quantity === 6
// positions.get('inst-1').realizedPnL === 116 ((130-100.5)*4 - 2)
```

### P/L mit aktuellem Preis:
```typescript
import { computePnL } from '@/lib/portfolio/calculations';

const position = positions.get('inst-1');
const withPrice = computePnL(position, 120);

// withPrice.currentPrice === 120
// withPrice.unrealizedPnL === 117 ((120-100.5)*6)
// withPrice.totalPnL === 233 (realized 116 + unrealized 117)
```

### Portfolio-Totals mit Filtern:
```typescript
import { computeTotals } from '@/lib/portfolio/calculations';

const totals = computeTotals(positionsWithPrices, {
  profitOnly: true, // Nur Gewinne zählen
  openOnly: true,   // Nur offene Positionen
  groupIds: ['group-1', 'group-2'], // Nur bestimmte Gruppen
});

// totals.profitOnlySum === Summe aller positiven P/L
// totals.totalPnL === Gesamter P/L (realized + unrealized)
```

---

**Status:** ✅ VOLLSTÄNDIG IMPLEMENTIERT

**Autor:** AI Assistant  
**Datum:** 13. Februar 2026  
**Version:** 1.0.0
