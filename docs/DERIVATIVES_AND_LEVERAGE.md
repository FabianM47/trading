# 🎯 Derivate & Hebel-Produkte Support

## ✨ Übersicht

Die App unterstützt jetzt **automatische Erkennung** und **korrekte Berechnung** von Derivaten und Hebel-Produkten (Turbos, Knock-Outs, Optionsscheine, Faktor-Zertifikate).

### Key Features

- ✅ **Automatische Erkennung** von Derivaten aus ISIN, WKN und Namen
- ✅ **Hebel-Extraktion** aus ING API-Daten und Produktnamen
- ✅ **Korrekte P/L-Berechnung** (Hebel ist bereits im Derivatpreis enthalten!)
- ✅ **Hebel-Badges** in der UI (z.B. "5x", "10x")
- ✅ **Produkttyp-Anzeige** (Turbo, Knock-Out, Optionsschein, etc.)
- ✅ **Underlying/Basiswert-Information**

---

## 🧮 Wichtig: Korrekte Hebel-Berechnung

### ❌ FALSCH (häufiger Fehler):
```typescript
// NICHT SO RECHNEN! ❌
Derivatpreis: 0,30€ → 0,40€
Änderung: +33,33%
Mit Hebel x5: +33,33% × 5 = +166,67%  ← FALSCH!
Gewinn: 200€ × 1,6667 = 333,33€       ← FALSCH!
```

**Problem:** Der Hebel ist **bereits im Derivatpreis** enthalten! Die Preisbewegung von 0,30€ → 0,40€ reflektiert bereits den 5x Hebel auf den Basiswert.

### ✅ RICHTIG:
```typescript
// SO RECHNEN! ✅
Derivatpreis: 0,30€ → 0,40€
Änderung: +33,33%
Gewinn: (0,40€ - 0,30€) × Menge
Bei 200€ Investment (666,67 Stück):
Gewinn: 0,10€ × 666,67 = 66,67€       ← KORREKT!
```

**Der Hebel wirkt auf den Basiswert, nicht auf das Derivat selbst!**

---

## 📊 Wie Derivate erkannt werden

### 1. Automatische Erkennung

Die App erkennt Derivate anhand mehrerer Kriterien:

#### a) ISIN-Muster
```typescript
// Deutsche Derivate starten oft mit DE000
DE000UJ7VC57  → Derivat ✅
DE0007164600  → Normale Aktie (SAP) ❌
```

#### b) Produktname
```typescript
"Turbo Call DAX 18000"           → Turbo ✅
"Knock-Out Put EUR/USD"          → Knock-Out ✅
"Optionsschein Apple Call"       → Optionsschein ✅
"Faktor 5x Short DAX"            → Faktor-Zertifikat ✅
"SAP SE Namens-Aktien"          → Keine Derivat ❌
```

#### c) ING API Daten
```typescript
// ING API liefert (wenn verfügbar):
{
  productType: "Turbo",
  leverage: 5.0,
  underlying: "DAX",
  knockOut: 18000.00
}
```

### 2. Hebel-Extraktion

#### Aus dem Namen:
```typescript
"Hebel 5 DAX"        → leverage: 5
"5x Long Gold"       → leverage: 5
"Faktor 10 Short"    → leverage: 10
"x3 EUR/USD"         → leverage: 3
```

#### Aus ING API:
```typescript
// Direkt aus response.leverage (falls vorhanden)
leverage: 5.0
```

---

## 💾 Datenstruktur

### Trade Interface

```typescript
export interface Trade {
  // Standard-Felder
  id: string;
  isin: string;
  ticker?: string;
  name: string;
  buyPrice: number;
  quantity: number;
  investedEur: number;
  buyDate: string;
  currentPrice?: number;
  
  // 🔥 NEUE Derivate-Felder
  isDerivative?: boolean;           // Ist es ein Derivat?
  leverage?: number;                // Hebel (z.B. 5.0 für 5x)
  productType?: string;             // "Turbo", "Knock-Out", "Optionsschein"
  underlying?: string;              // Basiswert (z.B. "DAX", "Apple Inc.")
  knockOut?: number;                // Knock-Out Schwelle
  optionType?: 'call' | 'put';     // Bei Optionsscheinen
  
  // ... weitere Felder
}
```

### Beispiel: Turbo-Zertifikat

```typescript
{
  id: "abc123",
  isin: "DE000UJ7VC57",
  ticker: "UJ7VC5",
  name: "Turbo Call DAX 18000",
  buyPrice: 0.30,
  quantity: 666.67,
  investedEur: 200.00,
  buyDate: "2026-02-17T00:00:00.000Z",
  currentPrice: 0.40,
  
  // Derivate-Informationen
  isDerivative: true,
  leverage: 5.0,
  productType: "Turbo",
  underlying: "DAX",
  knockOut: 18000.00,
  optionType: "call"
}
```

---

## 🧮 Berechnungslogik

### Standard P/L Berechnung (gilt für ALLE Assets)

```typescript
// lib/calculations.ts
export function calculateTradePnL(
  trade: Trade,
  currentPrice: number
): { pnlEur: number; pnlPct: number } {
  // Einfache Differenz-Rechnung
  const pnlEur = (currentPrice - trade.buyPrice) * trade.quantity;
  const pnlPct = ((currentPrice / trade.buyPrice) - 1) * 100;

  return { pnlEur, pnlPct };
}
```

**WICHTIG:** Diese Formel funktioniert **gleichermaßen** für:
- ✅ Normale Aktien
- ✅ Derivate mit Hebel
- ✅ Kryptowährungen
- ✅ ETFs

**Der Hebel ist BEREITS im Derivatpreis enthalten!**

### Zusätzliche Hebel-Informationen (nur für Anzeige)

```typescript
export function calculateDerivativeLeverageInfo(
  trade: Trade,
  currentPrice: number
): {
  actualPnLPct: number;          // Tatsächlicher Gewinn (z.B. +33,33%)
  derivativePriceChange: number; // Preisänderung des Derivats
  impliedUnderlyingChange: number; // Implizierte Änderung des Basiswerts (z.B. +6,67%)
} | null
```

**Beispiel:**
```typescript
// Derivat: 0,30€ → 0,40€ (Hebel 5x)
calculateDerivativeLeverageInfo(trade, 0.40)
// Returns:
{
  actualPnLPct: +33.33,            // Derivat-Performance
  derivativePriceChange: +33.33,   // Gleich wie actualPnLPct
  impliedUnderlyingChange: +6.67   // DAX ist ~6,67% gestiegen (33,33% / 5)
}
```

---

## 🎨 UI-Integration

### Hebel-Badges

In der TradeTable werden Derivate mit Hebel-Badges angezeigt:

```tsx
{trade.isDerivative && trade.leverage && (
  <span className="ml-2 text-xs bg-purple-500 bg-opacity-20 text-purple-400 px-2 py-0.5 rounded font-bold">
    {trade.leverage}x
  </span>
)}
```

**Beispiel-Anzeige:**
```
Bitcoin                          [Coingecko]
Apple Inc.                       [Finnhub]
Turbo Call DAX 18000  [5x]      [ING]  ← Hebel-Badge
```

### Produkttyp-Anzeige

```tsx
{trade.isDerivative && trade.productType && (
  <span className="ml-1 text-purple-400">• {trade.productType}</span>
)}
```

**Beispiel-Anzeige:**
```
Turbo Call DAX 18000  [5x]
UJ7VC5 • Turbo  ← Produkttyp
```

### Farben-Schema

- **Hebel-Badge:** 🟣 Lila (bg-purple-500)
- **Produkttyp:** 🟣 Lila (text-purple-400)
- **Derivat-Marker:** Visuell hervorgehoben

---

## 📡 API-Integration

### Validate API Response

```typescript
// GET /api/quotes/validate?identifier=DE000UJ7VC57

{
  "valid": true,
  "quote": {
    "price": 0.40,
    "currency": "EUR",
    "timestamp": 1708214400000
  },
  "symbolInfo": {
    "symbol": "UJ7VC5",
    "description": "Turbo Call DAX 18000",
    "type": "Derivat/Zertifikat"
  },
  // 🔥 NEU: Derivate-Informationen
  "derivativeInfo": {
    "isDerivative": true,
    "leverage": 5.0,
    "productType": "Turbo",
    "underlying": "DAX",
    "knockOut": 18000.00,
    "optionType": "call"
  },
  "source": "ING Wertpapiere"
}
```

### ING Quote Provider

```typescript
// lib/ingQuoteProvider.ts

export function extractDerivativeInfo(data: INGInstrumentHeader): {
  isDerivative: boolean;
  leverage?: number;
  productType?: string;
  underlying?: string;
  knockOut?: number;
  optionType?: 'call' | 'put';
}
```

**Erkennung erfolgt durch:**
1. Parsing des Produktnamens (Regex-Patterns)
2. Direkte Felder aus ING API (falls vorhanden)
3. ISIN-Muster (DE000... = wahrscheinlich Derivat)

---

## 🧪 Test-Szenarien

### Test 1: Turbo-Zertifikat Kaufen

```typescript
// Schritt 1: ISIN eingeben
input: "DE000UJ7VC57"

// Schritt 2: API-Response
{
  valid: true,
  quote: { price: 0.30, currency: "EUR" },
  derivativeInfo: {
    isDerivative: true,
    leverage: 5.0,
    productType: "Turbo",
    underlying: "DAX"
  }
}

// Schritt 3: Trade erstellen
{
  isin: "DE000UJ7VC57",
  buyPrice: 0.30,
  quantity: 666.67,
  investedEur: 200.00,
  isDerivative: true,  ← Automatisch gesetzt
  leverage: 5.0,        ← Automatisch extrahiert
  productType: "Turbo"  ← Automatisch erkannt
}
```

### Test 2: Gewinn-Berechnung

```typescript
// Einkauf: 0,30€
// Aktuell: 0,40€
// Menge: 666,67

calculateTradePnL(trade, 0.40)
// Returns:
{
  pnlEur: 66.67,    // (0,40 - 0,30) × 666,67 ✅
  pnlPct: 33.33     // ((0,40 / 0,30) - 1) × 100 ✅
}

// NICHT: 200€ × (1 + 0,3333 × 5) ❌
// Das wäre falsch!
```

### Test 3: UI-Anzeige

```tsx
// Mobile Card:
┌─────────────────────────────────────────┐
│ Turbo Call DAX 18000  [5x]             │
│ UJ7VC5 • Turbo                         │
│                            +66,67 EUR   │
│                              +33,33%    │
├─────────────────────────────────────────┤
│ Kaufkurs: 0,30€    Aktuell: 0,40€     │
│ Menge: 666,67      Gekauft: 17.02.26  │
└─────────────────────────────────────────┘

// Desktop Table:
┌─────────────────────────┬──────┬──────┬──────┬──────┬──────┬──────┐
│ Aktie                   │ ISIN │ Kauf │ Menge│ Akt. │ P/L  │ P/L% │
├─────────────────────────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ Turbo Call DAX [5x]    │DE000 │ 0,30 │ 666  │ 0,40 │+66,67│+33,33│
│ UJ7VC5 • Turbo         │      │      │      │      │      │      │
└─────────────────────────┴──────┴──────┴──────┴──────┴──────┴──────┘
```

---

## 📚 Unterstützte Derivate-Typen

| Typ | Beispiel-Name | Erkennungsmuster |
|-----|---------------|------------------|
| **Turbo** | "Turbo Call DAX 18000" | `name.includes('turbo')` |
| **Knock-Out** | "Knock-Out Put EUR/USD" | `name.includes('knock-out')` |
| **Optionsschein** | "Optionsschein Apple Call" | `name.includes('optionsschein')` |
| **Faktor-Zertifikat** | "Faktor 5x Short DAX" | `name.includes('faktor')` |
| **Zertifikat** | "Express-Zertifikat DAX" | `name.includes('zertifikat')` |

### Call vs. Put Erkennung

```typescript
if (name.includes('call')) → optionType: 'call'
if (name.includes('put'))  → optionType: 'put'
```

---

## ⚠️ Wichtige Hinweise

### 1. Hebel ist im Preis enthalten

**Wiederholung (sehr wichtig!):**

Der Derivatpreis reflektiert BEREITS die gehebelte Performance des Basiswerts.

```
Beispiel:
- DAX steigt von 18.000 auf 18.600 (+3,33%)
- Turbo 5x steigt von 0,30€ auf 0,40€ (+33,33% = 3,33% × 5)

Die App berechnet:
- P/L: +33,33% (Derivatpreis-Änderung)

NICHT:
- P/L: +166,67% (Derivat × Hebel nochmal) ❌
```

### 2. Knock-Out Risiko

Die App zeigt die `knockOut`-Schwelle an, berechnet aber NICHT automatisch den Totalverlust bei Knock-Out.

**TODO für Zukunft:**
- Warnung wenn currentPrice nahe knockOut
- Automatische Schließung bei Knock-Out

### 3. Gebühren und Finanzierungskosten

Die aktuelle Berechnung berücksichtigt KEINE:
- Ordergebühren
- Spread (Bid/Ask-Differenz)
- Overnight-Finanzierungskosten bei Hebel-Produkten

**Tatsächlicher Gewinn kann geringer sein!**

### 4. Währungsumrechnung

Die App rechnet ING-Preise automatisch in EUR um. Bei ausländischen Derivaten kann es Abweichungen geben.

---

## 🔮 Zukünftige Erweiterungen

### Geplant:
- [ ] Knock-Out Warnung (wenn Preis nahe Schwelle)
- [ ] Automatischer Totalverlust bei Knock-Out
- [ ] Finanzierungskosten-Berechnung
- [ ] Underlying-Preis-Tracking
- [ ] Implizite Volatilität (für Optionsscheine)
- [ ] Greeks-Anzeige (Delta, Gamma, etc.)

---

## 📖 Dokumentation

- **[ING_INTEGRATION.md](./ING_INTEGRATION.md)** - ING API Details
- **[MULTI_PROVIDER_ARCHITECTURE.md](./MULTI_PROVIDER_ARCHITECTURE.md)** - Provider-Architektur
- **Diese Datei** - Derivate & Hebel Support

---

## ✅ Zusammenfassung

Die App unterstützt jetzt vollständig Derivate und Hebel-Produkte:

1. ✅ Automatische Erkennung (ISIN, Name, API-Daten)
2. ✅ Hebel-Extraktion (aus Name oder ING API)
3. ✅ **KORREKTE Berechnung** (Hebel ist im Preis enthalten!)
4. ✅ Hebel-Badges in UI (z.B. "5x")
5. ✅ Produkttyp-Anzeige (Turbo, Knock-Out, etc.)
6. ✅ Persistierung aller Derivate-Informationen

**Die Berechnung ist korrekt und berücksichtigt, dass der Hebel bereits im Derivatpreis reflektiert ist!** 🎯
