# 🔍 Smart Search - Intelligente Multi-Provider Suche

## Überblick

Die neue Smart Search durchsucht **alle verfügbaren Provider gleichzeitig** und präsentiert die besten Ergebnisse sortiert nach Relevanz.

### ✨ Key Features

1. **Parallele Suche** - Alle Provider werden gleichzeitig abgefragt
2. **Dynamische Eingabe** - ISIN, Ticker oder Name - alles funktioniert
3. **Intelligente 2-Stufen-Sortierung** - Ergebnisse mit Kurs zuerst, dann nach Relevanz
4. **Deduplizierung** - Keine doppelten Ergebnisse
5. **Source Tags** - Zeigt an, woher die Daten kommen
6. **Preis-Priorisierung** - Sofort verwendbare Ergebnisse an erster Stelle

---

## 🚀 Wie es funktioniert

### Alte Architektur (Wasserfall)
```
User-Eingabe → Prüfe Crypto → Wenn nicht → Prüfe ING → Wenn nicht → Prüfe Yahoo → Wenn nicht → Finnhub
```
**Problem:** Nur 1 Provider wird verwendet, andere Ergebnisse gehen verloren

### Neue Architektur (Parallel)
```
User-Eingabe
    ↓
    ├─→ Coingecko  ─┐
    ├─→ ING        ─┤
    ├─→ Yahoo      ─┼→ Kombiniere & Sortiere → Top 15 Ergebnisse
    └─→ Finnhub    ─┘
```
**Vorteil:** Beste Ergebnisse von ALLEN Providern

---

## 📊 Beispiele

### Beispiel 1: "Bitcoin"
```typescript
GET /api/quotes/search?query=Bitcoin

Response:
{
  "results": [
    {
      "ticker": "BTC",
      "name": "Bitcoin",
      "currentPrice": 45234.50,
      "currency": "EUR",
      "exchange": "Cryptocurrency",
      "source": "Coingecko",
      "relevance": 100
    },
    // Eventuell auch Bitcoin-ETFs von Yahoo/Finnhub
  ],
  "sources": {
    "coingecko": 10,
    "ing": 0,
    "yahoo": 2,
    "finnhub": 3
  },
  "totalResults": 15
}
```

### Beispiel 2: "Apple"
```typescript
GET /api/quotes/search?query=Apple

Response:
{
  "results": [
    {
      "ticker": "AAPL",
      "name": "Apple Inc.",
      "currentPrice": 150.25,
      "currency": "EUR",
      "exchange": "NASDAQ",
      "source": "Finnhub",  // Beste Quelle für US-Aktien
      "relevance": 70
    },
    {
      "ticker": "AAPL",
      "name": "Apple Inc",
      "currentPrice": 150.30,
      "currency": "EUR",
      "source": "Yahoo",    // Globale Alternative
      "relevance": 77
    }
  ],
  "sources": {
    "coingecko": 0,
    "ing": 0,
    "yahoo": 5,
    "finnhub": 8
  }
}
```

### Beispiel 3: "DE0007164600" (SAP ISIN)
```typescript
GET /api/quotes/search?query=DE0007164600

Response:
{
  "results": [
    {
      "isin": "DE0007164600",
      "ticker": "716460",
      "name": "SAP SE",
      "currentPrice": 123.45,
      "currency": "EUR",
      "exchange": "ING Wertpapiere",
      "source": "ING",       // Beste Quelle für deutsche ISINs
      "relevance": 95
    },
    {
      "isin": "DE0007164600",
      "ticker": "SAP.DE",
      "name": "SAP SE",
      "currentPrice": 123.50,
      "currency": "EUR",
      "exchange": "XETRA",
      "source": "Yahoo",
      "relevance": 90
    }
  ]
}
```

### Beispiel 4: "AAPL"
```typescript
GET /api/quotes/search?query=AAPL

Response:
{
  "results": [
    {
      "ticker": "AAPL",
      "name": "Apple Inc.",
      "currentPrice": 150.25,
      "currency": "EUR",
      "source": "Finnhub",
      "relevance": 70
    }
    // Dedupliziert - kein AAPL von Yahoo, da identisch
  ]
}
```

---

## 🎯 Relevanz-Scoring & Sortierung

### Basis-Relevanz pro Provider

| Provider | Basis-Relevanz | Logik |
|----------|----------------|-------|
| **Coingecko** | 100-50 | -5 pro Position (1. Ergebnis = 100, 2. = 95, ...) |
| **ING** | 95 | Feste hohe Relevanz bei exakter ISIN-Suche |
| **Yahoo** | 90 (ISIN) / 80-50 (Name) | Höher bei ISIN-Match, sonst -3 pro Position |
| **Finnhub** | 70-50 | -2 pro Position |

### Sortier-Algorithmus

Ergebnisse werden in **2 Stufen** sortiert:

```typescript
1. Hat aktuellen Kurs? (Ja/Nein)
   ↓
2. Relevanz-Score (100-50)
```

**Beispiel:**
```typescript
Ergebnis A: { relevance: 100, currentPrice: undefined }
Ergebnis B: { relevance: 70, currentPrice: 150.25 }

→ Ergebnis B kommt ZUERST (hat Preis)
→ Dann Ergebnis A (kein Preis, auch wenn höhere Relevanz)
```

**Vorteil:** User sieht sofort verwendbare Ergebnisse (mit Kurs) an erster Stelle!

### Sortier-Beispiel

Vor der Sortierung:
```typescript
[
  { name: "Apple Inc.", relevance: 100, currentPrice: undefined },     // Kein Preis
  { name: "Apple Inc.", relevance: 70, currentPrice: 150.25 },        // Mit Preis (Finnhub)
  { name: "Bitcoin", relevance: 95, currentPrice: 45234.50 },         // Mit Preis (Coingecko)
  { name: "SAP SE", relevance: 90, currentPrice: undefined },         // Kein Preis
  { name: "Tesla Inc.", relevance: 68, currentPrice: 180.50 },        // Mit Preis (Yahoo)
]
```

Nach der Sortierung:
```typescript
[
  { name: "Bitcoin", relevance: 95, currentPrice: 45234.50 },         // 1️⃣ Mit Preis + höchste Relevanz
  { name: "Apple Inc.", relevance: 70, currentPrice: 150.25 },        // 2️⃣ Mit Preis
  { name: "Tesla Inc.", relevance: 68, currentPrice: 180.50 },        // 3️⃣ Mit Preis
  { name: "Apple Inc.", relevance: 100, currentPrice: undefined },    // 4️⃣ Kein Preis (trotz Relevanz 100!)
  { name: "SAP SE", relevance: 90, currentPrice: undefined },         // 5️⃣ Kein Preis
]
```

**Regel:** Ergebnisse MIT Kurs kommen IMMER vor Ergebnissen OHNE Kurs!

---

## 🔄 Deduplizierung

Ergebnisse werden dedupliziert basierend auf:
1. **ISIN** (falls vorhanden)
2. **Ticker** (lowercase)

**Regel:** Bei Duplikaten wird das Ergebnis mit der **höheren Relevanz** behalten.

```typescript
// Beispiel: AAPL von Finnhub (relevance: 70) vs. AAPL von Yahoo (relevance: 77)
// → Yahoo wird behalten (höhere Relevanz)
```

---

## 🎨 UI-Integration

### Source Badges

Die UI zeigt farbcodierte Badges an:

```tsx
{stock.source === 'Coingecko' && (
  <span className="bg-purple-500 bg-opacity-20 text-purple-400">
    Coingecko
  </span>
)}
{stock.source === 'ING' && (
  <span className="bg-blue-500 bg-opacity-20 text-blue-400">
    ING
  </span>
)}
{stock.source === 'Yahoo' && (
  <span className="bg-green-500 bg-opacity-20 text-green-400">
    Yahoo
  </span>
)}
{stock.source === 'Finnhub' && (
  <span className="bg-success bg-opacity-20 text-success">
    Finnhub
  </span>
)}
```

**Farbschema:**
- 🟣 **Lila** = Coingecko (Crypto)
- 🔵 **Blau** = ING (Deutsche Derivate)
- 🟢 **Grün** = Yahoo (Global)
- 🟡 **Gelb/Success** = Finnhub (US-Aktien)

---

## ⚡ Performance

### Timing
- **Vorher (Wasserfall):** 1-5 Sekunden (sequentiell)
- **Jetzt (Parallel):** 1-2 Sekunden (alle gleichzeitig)

### Timeouts
Jeder Provider hat ein 10-Sekunden Timeout:
```typescript
signal: AbortSignal.timeout(10000)
```

Wenn ein Provider nicht rechtzeitig antwortet, werden die anderen trotzdem angezeigt.

---

## 🧪 Test-Szenarien

### Test 1: Crypto-Name
```bash
curl "http://localhost:3000/api/quotes/search?query=Bitcoin"
```
**Erwartet:** Bitcoin von Coingecko an erster Stelle

### Test 2: Ticker-Symbol
```bash
curl "http://localhost:3000/api/quotes/search?query=AAPL"
```
**Erwartet:** Apple von Finnhub (evt. auch Yahoo)

### Test 3: Firmenname
```bash
curl "http://localhost:3000/api/quotes/search?query=Apple"
```
**Erwartet:** Apple Inc. von Finnhub & Yahoo, sortiert nach Relevanz

### Test 4: Deutsche ISIN
```bash
curl "http://localhost:3000/api/quotes/search?query=DE0007164600"
```
**Erwartet:** SAP von ING & Yahoo, ING an erster Stelle (höhere Relevanz)

### Test 5: Derivat-ISIN
```bash
curl "http://localhost:3000/api/quotes/search?query=DE000UJ7VC57"
```
**Erwartet:** Derivat von ING (einziger Provider)

### Test 6: Gemischte Suche
```bash
curl "http://localhost:3000/api/quotes/search?query=tesla"
```
**Erwartet:** Tesla Inc. von Finnhub & Yahoo, kombiniert

---

## 🔧 Konfiguration

### Provider-Reihenfolge ändern

Die Provider-Funktionen werden in `Promise.allSettled()` parallel aufgerufen:

```typescript
const [cryptoResults, ingResults, yahooResults, finnhubResults] = await Promise.allSettled([
  searchCrypto(query),
  searchING(query, isISIN),
  searchYahoo(query, isISIN),
  searchFinnhub(query, isISIN),
]);
```

**Um einen Provider zu deaktivieren:**
```typescript
// Ersetze Funktion durch leeres Array
searchING(query, isISIN),  // ← Entfernen
Promise.resolve([]),       // ← Leeres Ergebnis
```

### Relevanz-Gewichte anpassen

In den Provider-Funktionen (`searchCrypto`, `searchING`, etc.):

```typescript
// Beispiel: ING höher gewichten
relevance: 95  // Standard
relevance: 98  // Höhere Priorität
```

### Result-Limit ändern

```typescript
const topResults = sortedResults.slice(0, 15);  // ← Hier ändern
```

---

## 📈 Vorteile

### Vorher
- ❌ Nur 1 Provider pro Suche
- ❌ Wasserfall = langsam
- ❌ Andere Quellen werden ignoriert
- ❌ "Bitcoin" findet nichts (außer isCryptoSymbol = true)
- ❌ "Apple" nur bei Finnhub, nicht Yahoo

### Nachher
- ✅ Alle Provider gleichzeitig
- ✅ Parallel = schnell (~50% schneller)
- ✅ Beste Ergebnisse von überall
- ✅ **Ergebnisse mit Kurs kommen zuerst** (sofort verwendbar!)
- ✅ "Bitcoin", "BTC", "Crypto" findet alles
- ✅ "Apple", "AAPL", "US0378331005" findet alles
- ✅ Deduplizierung verhindert Doppler
- ✅ Source-Tags zeigen Datenquelle

---

## 🎯 Zusammenfassung

Die neue Smart Search ist:
- **Schneller** (parallel statt sequentiell)
- **Intelligenter** (2-Stufen-Sortierung: Preis > Relevanz)
- **Benutzerfreundlicher** (sofort verwendbare Ergebnisse zuerst)
- **Umfassender** (alle Provider)
- **Flexibler** (ISIN, Ticker, Name)
- **Transparenter** (Source-Tags)

**User kann jetzt suchen wie sie möchten:**
- "Bitcoin" ✅
- "BTC" ✅
- "AAPL" ✅
- "Apple" ✅
- "DE0007164600" ✅
- "SAP" ✅
- "Crypto" ✅

**Alle Ergebnisse mit aktuellem Kurs erscheinen automatisch zuerst!** 🎉

---

## 📚 Weitere Dokumentation

- **[SORTING_LOGIC.md](./SORTING_LOGIC.md)** - Detaillierte Visualisierung der Sortier-Logik
- **[MULTI_PROVIDER_ARCHITECTURE.md](./MULTI_PROVIDER_ARCHITECTURE.md)** - Provider-Architektur
- **[ING_INTEGRATION.md](./ING_INTEGRATION.md)** - ING Wertpapiere API Details
