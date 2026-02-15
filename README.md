# Trading Portfolio Tracker

Eine moderne Web-App zum Tracking von Aktien-Trades mit Echtzeit-P/L-Analyse. Entwickelt mit Next.js, TypeScript und Tailwind CSS im eleganten Dark-Mode-Design inspiriert von modernen Broker-Plattformen.

## Features

✨ **Portfolio-Übersicht**
- Gesamtwert und investierte Summe
- Gesamt P/L (EUR und %)
- Monatsauswertung für aktuelle Trades
- Anzeige großer Marktindizes (S&P 500, Nasdaq, DAX, Euro Stoxx 50)

📊 **Trade-Management**
- Trades hinzufügen per Suche (Name/Ticker) oder ISIN
- **Live-Suche über Finnhub API** beim Eingeben
- **Aktueller Kurs wird direkt in Suchergebnissen angezeigt**
- Automatische ISIN-Validierung beim Speichern
- **Auto-Fill**: Kaufpreis wird automatisch mit aktuellem Kurs gefüllt
- Button zum manuellen Holen des aktuellen Kurses
- Warnung bei Abweichung von >10% zwischen aktuellem Kurs und Kaufkurs
- Eingabe per Stückzahl ODER Investitionssumme
- Automatische P/L-Berechnung
- Detaillierte Trade-Liste mit aktuellen Kursen

🔍 **Filter & Sortierung**
- Zeitraum: Dieser Monat, Letzte 30 Tage, YTD, Custom Range, Alle
- Nur Gewinner anzeigen
- Suche nach Name, Ticker, ISIN
- Sortierung nach P/L EUR, P/L %, Datum, Name

⚡ **Live-Updates**
- Automatische Kurs-Aktualisierung alle 15 Minuten
- **Marktindizes werden live von Finnhub geholt** (S&P 500, Nasdaq, DAX, Euro Stoxx 50)
- Alle Indizes in EUR angezeigt (automatische Umrechnung)
- Manueller Refresh-Button
- In-Memory Cache für schnelle Performance

🎨 **Design**
- **Dark Mode** mit modernem Fintech-Look
- Inspiriert von führenden Broker-Apps
- Fette, große Zahlen für wichtige Werte
- Monospace-Font für Zahlen (tabular-nums)
- Subtile Schatten und Hover-Effekte
- Mobile-First & Responsive
- Klare Farbkodierung: Grün = Gewinn, Rot = Verlust

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Data Fetching**: SWR (Stale-While-Revalidate)
- **Storage**: localStorage (mit Versionierung & Migration)
- **Testing**: Vitest

## Setup & Installation

### Voraussetzungen

- Node.js 18+ und npm/pnpm/yarn

### Installation

```bash
# Repository klonen
git clone <your-repo-url>
cd trading

# Dependencies installieren
npm install
# oder
pnpm install

# Environment-Variablen konfigurieren
cp .env.local.example .env.local
# Bearbeite .env.local und füge deinen Finnhub API Key ein
```

### Finnhub API Key einrichten

1. Registriere dich kostenlos bei [Finnhub](https://finnhub.io/register)
2. Kopiere deinen API Key
3. Erstelle eine `.env.local` Datei im Root-Verzeichnis:

```bash
FINNHUB_API_KEY=dein_api_key_hier
```

**Hinweis**: Ohne API Key werden Mock-Daten verwendet. Für echte Aktienkurse ist ein Finnhub API Key erforderlich.

### Development Server starten

```bash
npm run dev
```

Die App läuft nun auf [http://localhost:3000](http://localhost:3000).

### Build für Produktion

```bash
npm run build
npm start
```

### Tests ausführen

```bash
# Unit Tests
npm test

# Mit Coverage
npm run test:coverage
```

## Deployment auf Vercel

### Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/trading-portfolio)

### Manuelle Deployment-Schritte

1. **Vercel Account erstellen** (falls noch nicht vorhanden)
2. **Projekt verbinden**:
   ```bash
   npm i -g vercel
   vercel login
   vercel
   ```
3. **Environment Variables konfigurieren**:
   - Gehe zu deinem Projekt in Vercel Dashboard
   - Settings → Environment Variables
   - Füge hinzu: `FINNHUB_API_KEY` mit deinem API Key
   - Wähle: Production, Preview, Development (je nach Bedarf)
4. **Deploy**: `vercel --prod`

### Environment Variables in Vercel

Für echte Aktienkurse:

```env
FINNHUB_API_KEY=dein_finnhub_api_key
```

**So richtest du es ein:**
1. Vercel Dashboard öffnen
2. Dein Projekt auswählen
3. Settings → Environment Variables
4. Name: `FINNHUB_API_KEY`, Value: Dein API Key
5. Für alle Environments (Production, Preview, Development) aktivieren
6. Neu deployen

## Projektstruktur

```
trading/
├── app/
│   ├── api/
│   │   └── quotes/
│   │       ├── route.ts          # API Route für Kursdaten
│   │       └── validate/
│   │           └── route.ts      # API Route für ISIN-Validierung
│   ├── globals.css               # Globale Styles
│   ├── layout.tsx                # Root Layout
│   └── page.tsx                  # Dashboard (Homepage)
├── components/
│   ├── EmptyState.tsx            # Leerzustand
│   ├── FiltersBar.tsx            # Filter-Leiste
│   ├── IndexCards.tsx            # Marktindizes
│   ├── PortfolioSummary.tsx      # Portfolio-Übersicht
│   ├── TradeFormModal.tsx        # Trade hinzufügen Modal (mit Validierung)
│   └── TradeTable.tsx            # Trade-Liste (responsive)
├── lib/
│   ├── calculations.ts           # P/L-Berechnungen & Filter
│   ├── quoteProvider.ts          # Quote Provider (Finnhub/Mock)
│   └── storage.ts                # localStorage Management
├── types/
│   └── index.ts                  # TypeScript Types
├── __tests__/
│   └── calculations.test.ts      # Unit Tests
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vitest.config.ts
└── README.md
```

## Datenmodell

### Trade

```typescript
{
  id: string;              // UUID
  isin: string;            // ISIN der Aktie
  ticker?: string;         // Optional: Ticker-Symbol
  name: string;            // Aktienname
  buyPrice: number;        // Kaufkurs in EUR
  quantity: number;        // Stückzahl
  investedEur: number;     // Investierte Summe (buyPrice * quantity)
  buyDate: string;         // ISO Date String
}
```

### Quote

```typescript
{
  isin?: string;
  ticker?: string;
  price: number;           // Aktueller Kurs
  currency: string;        // Währung (EUR)
  timestamp: number;       // Unix Timestamp
}
```

## Berechnungslogik

### P/L pro Trade

- **P/L (EUR)**: `(currentPrice - buyPrice) × quantity`
- **P/L (%)**: `((currentPrice / buyPrice) - 1) × 100`

### Portfolio Gesamt

- **Total Invested**: Summe aller `investedEur`
- **Total Value**: Summe aller `(currentPrice × quantity)`
- **P/L (EUR)**: `totalValue - totalInvested`
- **P/L (%)**: `((totalValue / totalInvested) - 1) × 100`

### Monatsauswertung

Filtert Trades nach `buyDate` im aktuellen Monat und berechnet P/L analog.

## Limitierungen & Hinweise

### localStorage
- Daten werden nur im Browser gespeichert
- Max. ca. 5-10 MB Speicher (je nach Browser)
- Keine Synchronisation zwischen Geräten
- **Migration**: Vorbereitet für Umstellung auf PostgreSQL/SQLite

### Cache
- In-Memory Cache auf Server (Serverless Function)
- Cache wird bei jedem Cold Start geleert
- Für Produktion empfohlen: Redis, Vercel KV, oder andere persistente Cache-Lösung

### Quote Provider
- **Aktuell**: Finnhub API für echte Aktienkurse
- **Dynamische ISIN-Suche**: Keine hardcodierten Mappings mehr
- Automatischer Fallback auf Mock-Provider wenn kein API Key vorhanden
- **Kein Fallback auf Mock-Daten**: Wenn Finnhub keine Daten liefert, wird "No Data" angezeigt
- Bei fehlenden Aktienkursen: Verwendung des letzten Kaufpreises für P/L-Berechnung
- **Automatische Währungsumrechnung**: Alle Kurse werden in EUR angezeigt
- Unterstützt: USD, GBP, CHF, JPY → EUR Konvertierung
- **Rate Limits**: Finnhub Free Tier: 60 Calls/Minute
- Unterstützte Märkte: US-Aktien (NYSE, NASDAQ), Deutsche Aktien (Xetra), UK, Schweiz, Japan

### Unterstützte Aktien (mit ISIN-Mapping)

**US Tech Stocks:**
- Apple (AAPL / US0378331005)
- Microsoft (MSFT / US5949181045)
- Tesla (TSLA / US88160R1014)
- Amazon (AMZN / US0231351067)
- Alphabet (GOOGL / US02079K3059)
- Nvidia (NVDA / US67066G1040)
- Meta (META / US30303M1027)
- SAP (SAP / DE0007164600)
- Siemens (SIE / DE0007236101)
- Allianz (ALV / DE0008404005)

## Erweiterungsmöglichkeiten

### Kurzfristig
- [ ] Export/Import von Trades (JSON/CSV)
- [ ] Sell-Funktion für geschlossene Positionen
- [ ] Performance-Charts (z.B. mit Recharts)
- [ ] Dividenden-Tracking

### Mittelfristig
- [ ] Backend mit PostgreSQL/Supabase
- [ ] User Authentication (NextAuth.js)
- [ ] Mehrere Portfolios pro User
- [ ] Echte Quote-API Integration (Alpha Vantage, Finnhub, etc.)

### Langfristig
- [ ] Multi-Currency Support
- [ ] Benachrichtigungen (E-Mail/Push)
- [ ] Steuer-Reporting (FIFO/LIFO)
- [ ] Social Sharing

## Testing

Das Projekt beinhaltet umfassende Unit Tests für die Berechnungslogik:

```bash
npm test
```

Getestet werden:
- P/L-Berechnungen (EUR und %)
- Portfolio-Aggregation
- Filter-Funktionen (Zeitraum, Suche, Gewinner)
- Sortierung
- Monatsauswertung

## Lizenz

MIT

## Autor

Senior Fullstack Engineer

---

**Hinweis**: Dies ist ein MVP für Demo-Zwecke. Für produktiven Einsatz sollten ein echtes Backend, Authentifizierung und eine zuverlässige Quote-API implementiert werden.
