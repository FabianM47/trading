# 🎯 Position Aggregation & TradingView Integration

## Implementierte Features

### 1. **Aggregierte Positionen**
Trades zur gleichen Aktie werden jetzt automatisch zusammengefasst:

- **Gruppierung**: Nach ISIN oder Ticker-Symbol
- **Durchschnittsberechnung**: Gewichteter Kaufpreis basierend auf Mengen
- **P/L Tracking**: 
  - Unrealisiert: Aus offenen Trades
  - Realisiert: Aus geschlossenen Trades
  - Gesamt: Kombination beider Werte

### 2. **TradingView Chart Integration**
Interaktive Charts direkt in der Anwendung:

- **Automatisches Symbol-Mapping**:
  - US-Aktien → `NASDAQ:SYMBOL`
  - Deutsche Aktien → `XETRA:SYMBOL`
  - UK → `LSE:`, Schweiz → `SIX:`, etc.
  - Crypto → `BINANCE:BTCUSDT`

- **Error Handling**:
  - Loading State mit Spinner
  - Fallback bei Ladefehlern
  - Link zu TradingView als Alternative

### 3. **Position Detail Modal**
Klick auf Position öffnet detailliertes Modal:

**Enthält:**
- ✅ TradingView Live-Chart
- ✅ 8 Key Metrics (Menge, Ø Preis, P/L, etc.)
- ✅ Liste aller offenen Trades
- ✅ Liste aller geschlossenen Trades
- ✅ Actions: Bearbeiten, Schließen, Löschen

### 4. **Optimierte Trade Table**
Zeigt aggregierte Positionen statt einzelne Trades:

**Neue Spalten:**
- Ø Kaufpreis (gewichtet)
- Gesamtwert der Position
- Gesamt P/L (€ und %)
- Anzahl Trades (offen/geschlossen)

**Interaktiv:**
- Klickbare Rows → öffnet Detail Modal
- Sortierbar nach allen Feldern
- Mobile + Desktop optimiert

### 5. **Performance-Optimierungen**
- Deduplizierte Quote-Abfrage (1 Abfrage pro Symbol statt pro Trade)
- Memoized Aggregations-Berechnungen
- Cached TradingView Scripts

---

## 📁 Neue/Geänderte Dateien

### Neu erstellt:
1. **`lib/aggregatePositions.ts`**
   - `aggregatePositions()`: Haupt-Aggregationslogik
   - `getUniqueSymbols()`: Extrahiert eindeutige Symbole
   - `findPosition()`: Sucht Position nach Symbol/ISIN

2. **`components/TradingViewChart.tsx`**
   - TradingView Widget Integration
   - Symbol-Mapping-Logik
   - Error & Loading States

3. **`components/PositionDetailModal.tsx`**
   - Detail-Ansicht für Positionen
   - Trade-Listen (offen/geschlossen)
   - Action-Buttons

### Aktualisiert:
1. **`types/index.ts`**
   - Neues `AggregatedPosition` Interface

2. **`components/TradeTable.tsx`**
   - Props: `positions` statt `trades`
   - Zeigt aggregierte Daten
   - Klickbar für Detail-Modal

3. **`app/page.tsx`**
   - Aggregations-Logik integriert
   - PositionDetailModal State
   - Optimierte Quote-Abfrage

---

## 🚀 Verwendung

### Mehrere Trades zur gleichen Aktie anlegen
```typescript
// Trade 1: 10 Aktien @ 100€
// Trade 2: 5 Aktien @ 120€
// 
// Ergebnis in Tabelle:
// - Gesamtmenge: 15 Aktien
// - Ø Kaufpreis: 106,67€ (gewichtet)
// - Im Detail Modal: Beide Trades sichtbar
```

### Position öffnen
```typescript
// Klick auf Position in Tabelle
// → Modal öffnet sich mit:
//   - TradingView Chart
//   - Statistiken
//   - Liste aller Trades
//   - Action-Buttons für einzelne Trades
```

### TradingView Symbol-Mapping
```typescript
import { getTradingViewSymbol } from '@/components/TradingViewChart';

// US-Aktien
getTradingViewSymbol('AAPL', 'US0378331005')
// → "NASDAQ:AAPL"

// Deutsche Aktien
getTradingViewSymbol('SAP', 'DE0007164600')
// → "XETRA:SAP"

// Crypto
getTradingViewSymbol('BTC')
// → "BINANCE:BTCUSDT"
```

---

## 🔧 Technische Details

### Aggregations-Algorithmus
```typescript
// Gruppierung
const grouped = trades.reduce((acc, trade) => {
  const key = trade.isin || trade.ticker;
  acc[key] = acc[key] || [];
  acc[key].push(trade);
  return acc;
}, {});

// Durchschnitt berechnen
const totalInvested = trades.reduce((sum, t) => sum + t.investedEur, 0);
const totalQuantity = trades.reduce((sum, t) => sum + t.quantity, 0);
const avgPrice = totalInvested / totalQuantity;
```

### Quote-Optimierung
```typescript
// Vorher: Ein Request pro Trade
// isins = ['AAPL', 'AAPL', 'NVDA', 'NVDA', 'NVDA']
// → 5 API Calls

// Nachher: Ein Request pro Symbol
// isins = ['AAPL', 'NVDA']
// → 2 API Calls (60% Reduktion)
```

### TradingView Integration
```typescript
// Script wird nur einmal geladen
const existingScript = document.querySelector('script[src="..."]');
if (existingScript && window.TradingView) {
  // Wiederverwendung
  initializeWidget();
} else {
  // Neues Laden
  loadScript();
}
```

---

## 📊 Datenfluss

```
Trades (DB)
    ↓
aggregatePositions()
    ↓
AggregatedPosition[]
    ↓
TradeTable (zeigt Positionen)
    ↓
onClick → PositionDetailModal
    ↓
TradingViewChart (lädt Chart)
```

---

## ⚠️ Bekannte Limitierungen

1. **TradingView CSP**: 
   - Externe Scripts können durch Content Security Policy blockiert werden
   - Fallback: Link zu TradingView Website

2. **Symbol-Mapping**: 
   - Nicht alle Börsen/Derivate werden automatisch erkannt
   - Fallback: NASDAQ als Standard

3. **Aggregation**: 
   - Nur gleiche ISIN/Ticker werden zusammengefasst
   - Derivate mit unterschiedlichen Hebeln bleiben getrennt

---

## 🧪 Testing Checkliste

- [x] Mehrere Trades zur gleichen Aktie anlegen
- [x] Position öffnen → Modal zeigt alle Trades
- [x] TradingView Chart lädt korrekt
- [x] Error State bei fehlgeschlagenem Chart-Load
- [x] Mobile Ansicht funktioniert
- [x] Sortierung nach allen Feldern
- [x] Trade-Actions im Modal (Edit/Close/Delete)
- [x] Deduplizierte Quote-Abfrage
- [x] Performance-Verbesserung messbar

---

## 📈 Performance Impact

**Vorher:**
- 10 Trades → 10 API Calls für Quotes
- Tabelle zeigt 10 Zeilen

**Nachher:**
- 10 Trades (5x AAPL, 3x NVDA, 2x TSLA) → 3 API Calls
- Tabelle zeigt 3 Zeilen (aggregiert)
- 70% weniger API Calls
- Übersichtlichere Darstellung

---

## 🎨 UI/UX Improvements

1. **Reduzierte visuelle Komplexität**
   - Weniger Zeilen in Tabelle
   - Fokus auf Gesamt-Positionen

2. **Mehr Kontext auf einen Blick**
   - Durchschnittspreise sofort sichtbar
   - Gesamt-P/L prominent

3. **Drill-Down Pattern**
   - Übersicht: Aggregierte Positionen
   - Detail: Alle einzelnen Trades

4. **Professionelles Trading-Gefühl**
   - Live-Charts wie bei echten Brokern
   - Statistiken wie Trade Republic/Scalable

---

## 🔮 Zukünftige Erweiterungen

### Möglich:
- [ ] Weitere Chart-Bibliotheken als Alternative
- [ ] Eigene Chart-Lösung mit Recharts
- [ ] Historische Performance pro Position
- [ ] Position-Alerts (z.B. bei +10%)
- [ ] Export-Funktion für einzelne Positionen

### Geplant:
- [ ] Tax-Loss Harvesting Vorschläge
- [ ] Rebalancing-Empfehlungen
- [ ] Position-Größen-Analyse

---

**Status:** ✅ Vollständig implementiert und getestet
**Version:** 1.0.0
**Datum:** 21. Februar 2026
