# ING Wertpapiere Integration

## Übersicht

Die App nutzt die **kostenlose ING Wertpapiere API** als Fallback-Datenquelle für Wertpapiere, die im Finnhub Free Plan nicht verfügbar sind.

## Vorteile

✅ **Kostenlos** - Kein API-Key erforderlich  
✅ **Derivate & Zertifikate** - Beste Abdeckung für deutsche Derivate  
✅ **Optionsscheine** - Alle gängigen Optionsscheine verfügbar  
✅ **Deutsche Wertpapiere** - Sehr gute Abdeckung des deutschen Markts  
✅ **Schnell** - Direkte REST-API ohne Authentifizierung  

## Unterstützte Wertpapiere

### Primär:
- 🇩🇪 **Deutsche Derivate** (DE000...)
- 📊 **Zertifikate** (Turbo, Knock-Out, Factor, etc.)
- 📈 **Optionsscheine** (Call, Put)
- 🏦 **ETFs** (europäische)

### Auch verfügbar:
- 🇦🇹 Österreich (AT...)
- 🇳🇱 Niederlande (NL...)
- 🇫🇷 Frankreich (FR...)
- 🇧🇪 Belgien (BE...)
- 🇱🇺 Luxemburg (LU...)
- 🇨🇭 Schweiz (CH...)
- 🇮🇹 Italien (IT...)
- 🇪🇸 Spanien (ES...)

## Technische Details

### API-Endpunkt
```
GET https://component-api.wertpapiere.ing.de/api/v1/components/instrumentheader/{ISIN}
```

### Header
```javascript
{
  'User-Agent': 'Mozilla/5.0',
  'Origin': 'https://wertpapiere.ing.de',
  'Referer': 'https://wertpapiere.ing.de/',
  'Accept': 'application/json'
}
```

### Response-Felder
```typescript
{
  price?: number;        // Direkter Preis
  bid?: number;          // Geldkurs (Bid)
  ask?: number;          // Briefkurs (Ask)
  currency?: string;     // Währung (meist EUR)
  name?: string;         // Wertpapiername
  isin?: string;         // ISIN
  wkn?: string;          // WKN (deutsche Kennung)
}
```

## Preis-Logik

Die App verwendet folgende Priorität für den Preis:

1. **`price`** - Wenn vorhanden (direkter Handelspreis)
2. **Midpoint** - `(bid + ask) / 2` (Spread-Mitte)
3. **`bid`** - Geldkurs (wenn nur Bid verfügbar)
4. **`ask`** - Briefkurs (wenn nur Ask verfügbar)

## Integration in die App

### 1. Search API (`/api/quotes/search`)

```typescript
// Wenn Query eine ISIN ist
if (isISIN && shouldTryING(query)) {
  const ingData = await fetchINGInstrumentHeader(query);
  // Zeige Ergebnis mit ING-Daten
}
```

### 2. Validate API (`/api/quotes/validate`)

```typescript
// Versuche ING zuerst für deutsche/europäische ISINs
if (isISIN && shouldTryING(identifier)) {
  const ingData = await fetchINGInstrumentHeader(identifier);
  // Validiere mit ING-Daten
}
// Fallback zu Finnhub
```

### 3. Quotes API (`/api/quotes`)

```typescript
// Teile ISINs in ING und Finnhub
const ingISINs = isins.filter(isin => shouldTryING(isin));
const finnhubISINs = isins.filter(isin => !shouldTryING(isin));

// Fetch parallel von beiden Quellen
const [finnhubQuotes, ingQuotes] = await Promise.all([
  provider.fetchBatch(finnhubISINs),
  fetchINGQuotes(ingISINs)
]);
```

## Beispiel-ISINs

### Derivate
```
DE000UJ7VC57  - Beispiel-Zertifikat
DE000VQ5RJ98  - Beispiel-Turbo
DE000VL8KAL8  - Beispiel-Knock-Out
```

### ETFs
```
DE0005933931  - iShares Core DAX UCITS ETF
LU0392494562  - ComStage MSCI World
```

### Aktien
```
DE0007164600  - SAP SE
DE0008469008  - BMW
```

## Performance

- ⚡ **Timeout**: 10 Sekunden
- 📦 **Batch-Größe**: Max 5 parallele Requests
- 🔄 **Retry**: Kein automatisches Retry (Fallback zu Finnhub)
- 💾 **Caching**: 5-Minuten Cache in `/api/quotes`

## Fehlerbehandlung

```typescript
try {
  const ingData = await fetchINGInstrumentHeader(isin);
  if (!ingData || !extractINGPrice(ingData)) {
    // Kein Preis verfügbar -> Fallback zu Finnhub
  }
} catch (error) {
  // API-Fehler -> Fallback zu Finnhub
  console.error('ING lookup failed:', error);
}
```

## Limitierungen

❌ **Nicht verfügbar:**
- US-Aktien (nur über Finnhub)
- Asiatische Märkte (nur über Finnhub)
- Kryptowährungen (nicht unterstützt)
- Forex (nicht unterstützt)
- Historische Daten (nur aktueller Kurs)

## Testing

```bash
# Teste ING API direkt
curl -H "User-Agent: Mozilla/5.0" \
     -H "Origin: https://wertpapiere.ing.de" \
     -H "Referer: https://wertpapiere.ing.de/" \
     "https://component-api.wertpapiere.ing.de/api/v1/components/instrumentheader/DE000UJ7VC57"
```

## Credits

Vielen Dank an den Community-Contributor für den Python-Code der ING-Integration! 🙏
