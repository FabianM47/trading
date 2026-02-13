# 📋 Projekt-Kontext: Portfolio Trading Web-App

## 🎯 Projektziel
Produktionsreife, sichere und performante Portfolio-Web-App für strukturierte Aktienhandels-Erfassung und -Auswertung.

---

## 📊 Funktionale Anforderungen

### Core Features
- ✅ **Trades erfassen** (Kauf/Verkauf)
- ✅ **Aktienauswahl** via ISIN oder Suche
- ✅ **Flexible Eingabe**: Kaufkurs + (Stückzahl ODER Geldbetrag)
- ✅ **Gebühren** (optional)
- ✅ **Automatische Kursabfrage** alle 15 Minuten
- ✅ **Gruppen/Tags** für Instrumente

### Anzeige & Auswertungen
- **Gewinn/Verlust Anzeige**:
  - Aktueller Gewinn/Verlust (€ + %)
  - Monatsgewinn (optional nur positive Gewinne)
  - Gesamtgewinn
- **Filter-Optionen**:
  - Zeitraum
  - Gruppe
  - Instrument
  - Offene/Geschlossene Positionen
- **Dashboard**:
  - KPI Cards oben
  - Große Indizes prominent platziert
  - Konsistente, gerundete Berechnungen

---

## 🛠️ Tech Stack

### Core Framework
- **Next.js 16** mit App Router
- **TypeScript** (strict mode)
- **React 19** (Server Components als Default)

### Vercel Services
- **Vercel Postgres** - Hauptdatenbank
- **Vercel KV (Redis)** - Caching + Rate Limiting
- **Vercel Cron** - 15-Minuten Preisupdate
- **Vercel Edge Middleware** - Auth-Gating
- **Vercel Analytics** - Monitoring
- **Vercel Speed Insights** - Performance

### Validierung & Forms
- **Zod** - Schema Validation
- **React Hook Form** - Formular-Management
- **@hookform/resolvers** - Zod Integration

### Finanz-Berechnungen
- **Decimal.js** oder **big.js** - Präzise Arithmetik (KEINE Float-Fehler!)

### UI/UX
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component Library
- **TanStack Table** - Daten-Tabellen mit Filtering/Sorting

### Sicherheit & Auth
- **NextAuth.js** oder **Clerk** - Authentication
- **@node-rs/argon2** - Password Hashing
- **speakeasy** - TOTP/2FA (optional)
- **Rate Limiting** via Vercel KV

---

## 🏗️ Architektur-Prinzipien

### Clean Architecture
```
┌─────────────────────────────────────────────────┐
│ UI Layer (app/, components/)                    │
│ ├─ Server Components (default)                  │
│ ├─ Client Components (nur bei Interaktivität)   │
│ └─ Route Handlers (app/api/)                    │
├─────────────────────────────────────────────────┤
│ Application Layer (app/actions/, lib/services/) │
│ ├─ Server Actions (Mutations)                   │
│ ├─ Business Logic Services                      │
│ └─ Use Cases                                     │
├─────────────────────────────────────────────────┤
│ Domain Layer (lib/domain/)                      │
│ ├─ Entities (Trade, Position, Portfolio)        │
│ ├─ Value Objects (Money, Percentage)            │
│ ├─ Domain Services (ProfitCalculator)           │
│ └─ Pure Functions (keine Side Effects!)         │
├─────────────────────────────────────────────────┤
│ Infrastructure Layer (lib/infrastructure/)      │
│ ├─ Database Repositories                        │
│ ├─ External APIs (Kursdaten)                    │
│ ├─ Caching (Vercel KV)                          │
│ └─ Auth Provider                                 │
└─────────────────────────────────────────────────┘
```

### Wichtige Prinzipien
- ✅ **Keine Logik in Komponenten** - Nur Rendering
- ✅ **Pure Functions** für Berechnungen
- ✅ **Dependency Injection** wo sinnvoll
- ✅ **Interface Segregation** - Kleine, fokussierte Interfaces
- ✅ **Testbarkeit** - Alle Domain-Logik unit-testbar
- ✅ **Reproduzierbare Berechnungen** - Deterministische Ergebnisse

---

## 🔐 Sicherheitsanforderungen

### Authentication & Authorization
- ✅ **Login Pflicht** für alle geschützten Routen
- ✅ **Optional 2FA (TOTP)** wenn einfach realisierbar
- ✅ **Edge Middleware** für Auth-Gating
- ✅ **Sichere Cookies** (httpOnly, secure, sameSite)
- ✅ **Session Management**

### Data Protection
- ✅ **Input Validation** mit Zod (Client + Server)
- ✅ **SQL Injection Protection** (Prepared Statements)
- ✅ **XSS Protection** (React Auto-Escaping)
- ✅ **CSRF Protection** (Next.js integriert)
- ✅ **Rate Limiting** via Vercel KV
- ✅ **Cron Secret Protection** für automatisierte Jobs

### Best Practices
- ✅ Environment Variables für Secrets
- ✅ Keine Secrets in Git
- ✅ Audit Logging für kritische Aktionen
- ✅ Fehlerbehandlung ohne sensible Daten

---

## 🎨 Design-Anforderungen

### Design-Philosophie: Trade Republic Style
- **Modern & Minimalistisch**
- **Viel Weißraum**
- **Klare Typografie** (z.B. Inter, SF Pro)
- **Reduzierte Farbpalette**:
  - Grün für Gewinn (#00C853 oder ähnlich)
  - Rot für Verlust (#FF1744 oder ähnlich)
  - Neutral: Grau-Töne für Text
  - Weiß/Hellgrau für Hintergrund

### Layout-Struktur
```
┌──────────────────────────────────────────┐
│ Header (Logo, User Menu)                 │
├──────────────────────────────────────────┤
│ KPI Cards (Gesamt, Monat, Heute)        │
│ ┌────────┐ ┌────────┐ ┌────────┐       │
│ │ +1.2%  │ │ +0.8%  │ │ +0.3%  │       │
│ │ €1.234 │ │ €890   │ │ €345   │       │
│ └────────┘ └────────┘ └────────┘       │
├──────────────────────────────────────────┤
│ Große Indizes (DAX, S&P 500, Nasdaq)    │
│ ┌──────────────────────────────────────┐│
│ │ DAX         18.234,56  +1,23%  ↑    ││
│ │ S&P 500      5.123,45  +0,87%  ↑    ││
│ │ Nasdaq      15.678,90  -0,34%  ↓    ││
│ └──────────────────────────────────────┘│
├──────────────────────────────────────────┤
│ Filter (Zeitraum, Status, Gruppe)       │
├──────────────────────────────────────────┤
│ Portfolio Tabelle                        │
│ (TanStack Table mit Sortierung/Filter)  │
└──────────────────────────────────────────┘
```

### Zahlenformatierung
- ✅ **Beträge**: `1.234,56 €` (deutsches Format)
- ✅ **Prozent**: `+1,23%` oder `-0,87%`
- ✅ **Große Zahlen**: `1,2 Mio €` (ab 1 Million)
- ✅ **Farbcodierung**: Grün (positiv), Rot (negativ)

---

## 💰 Finanz-Berechnungen (Kritisch!)

### Anforderungen
- ✅ **Keine Float-Arithmetik** (0.1 + 0.2 ≠ 0.3 Problem!)
- ✅ **Decimal-Library verwenden** (Decimal.js oder big.js)
- ✅ **Konsistente Rundung** (2 Dezimalstellen für €)
- ✅ **Reproduzierbare Ergebnisse**

### Berechnungslogik (Domain Layer)
```typescript
// lib/domain/calculations/profit.calculator.ts
class ProfitCalculator {
  // Gewinn/Verlust für einzelne Position
  calculatePositionProfit(
    quantity: Decimal,
    buyPrice: Decimal,
    currentPrice: Decimal,
    fees: Decimal
  ): { absolute: Decimal; percentage: Decimal }

  // Monatsgewinn (nur positive optional)
  calculateMonthProfit(
    trades: Trade[],
    month: Date,
    onlyPositive: boolean
  ): Decimal

  // Gesamtgewinn
  calculateTotalProfit(portfolio: Portfolio): Decimal
}
```

### Edge Cases berücksichtigen
- ✅ Division durch Null
- ✅ Negative Stückzahlen (Shorts?)
- ✅ Gebühren > Gewinn
- ✅ Währungsumrechnung (falls mehrere Währungen)
- ✅ Verkauf in Tranchen (FIFO, LIFO, Average Cost?)

---

## 📁 Projekt-Struktur

```
trading/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── setup-2fa/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Dashboard
│   │   ├── portfolio/page.tsx
│   │   ├── trades/
│   │   │   ├── page.tsx
│   │   │   └── new/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── trades/route.ts
│   │   ├── stocks/search/route.ts
│   │   ├── prices/update/route.ts
│   │   └── cron/
│   │       └── update-prices/route.ts
│   ├── actions/
│   │   ├── trade.actions.ts
│   │   ├── portfolio.actions.ts
│   │   └── auth.actions.ts
│   └── middleware.ts                   # Edge Auth
│
├── components/
│   ├── ui/                             # shadcn/ui
│   ├── dashboard/
│   │   ├── kpi-cards.tsx
│   │   ├── index-overview.tsx
│   │   └── portfolio-table.tsx
│   ├── trades/
│   │   ├── trade-form.tsx
│   │   └── trade-list.tsx
│   └── shared/
│       ├── number-display.tsx
│       └── profit-badge.tsx
│
├── lib/
│   ├── domain/                         # ⭐ Domain Layer
│   │   ├── entities/
│   │   │   ├── trade.ts
│   │   │   ├── position.ts
│   │   │   └── portfolio.ts
│   │   ├── value-objects/
│   │   │   ├── money.ts
│   │   │   ├── percentage.ts
│   │   │   └── isin.ts
│   │   ├── services/
│   │   │   ├── profit-calculator.ts
│   │   │   ├── position-aggregator.ts
│   │   │   └── portfolio-analyzer.ts
│   │   └── types.ts
│   │
│   ├── infrastructure/                 # Infrastructure Layer
│   │   ├── database/
│   │   │   ├── client.ts
│   │   │   ├── repositories/
│   │   │   │   ├── trade.repository.ts
│   │   │   │   └── stock.repository.ts
│   │   │   └── migrations/
│   │   ├── cache/
│   │   │   └── redis.client.ts
│   │   ├── external/
│   │   │   ├── stock-api.client.ts
│   │   │   └── price-provider.ts
│   │   └── auth/
│   │       └── auth.config.ts
│   │
│   ├── application/                    # Application Services
│   │   ├── use-cases/
│   │   │   ├── create-trade.use-case.ts
│   │   │   ├── get-portfolio.use-case.ts
│   │   │   └── update-prices.use-case.ts
│   │   └── services/
│   │       ├── trade.service.ts
│   │       └── portfolio.service.ts
│   │
│   ├── schemas/                        # Zod Schemas
│   │   ├── trade.schema.ts
│   │   ├── stock.schema.ts
│   │   └── auth.schema.ts
│   │
│   └── utils/
│       ├── formatting.ts               # Zahlenformatierung
│       ├── decimal.ts                  # Decimal Helpers
│       └── date.ts                     # Datums-Helpers
│
├── db/
│   ├── schema.sql
│   └── migrations/
│
├── tests/
│   ├── unit/
│   │   └── domain/                     # Domain Logic Tests!
│   └── integration/
│
├── .env.example
├── .env.local
├── CONTRIBUTING.md
├── PROJECT_CONTEXT.md                  # Diese Datei
└── README.md
```

---

## 📋 Implementierungs-Workflow

### Phase 1: Foundation (NICHT jetzt ausführen!)
1. Database Schema Design
2. Domain Models & Value Objects
3. Berechnungslogik (Pure Functions)
4. Unit Tests für Berechnungen

### Phase 2: Infrastructure
1. Database Repositories
2. External API Integration (Kursdaten)
3. Caching Layer
4. Auth Setup

### Phase 3: Application Layer
1. Use Cases
2. Server Actions
3. API Routes
4. Cron Jobs

### Phase 4: UI
1. Authentication Pages
2. Dashboard Layout
3. KPI Cards & Indizes
4. Portfolio Table
5. Trade Forms

### Phase 5: Polish
1. Error Handling
2. Loading States
3. Responsive Design
4. Performance Optimization
5. Security Audit

---

## ⚠️ Wichtige Entscheidungen vor Start

### Zu klären:
1. **Authentication Provider**: NextAuth.js vs Clerk vs Supabase Auth?
2. **Stock Price API**: Alpha Vantage, Twelve Data, Yahoo Finance?
3. **Verkaufsstrategie**: FIFO, LIFO oder Average Cost Basis?
4. **Währungen**: Nur EUR oder multi-currency?
5. **Shorts erlauben**: Ja/Nein?
6. **2FA Pflicht**: Optional oder verpflichtend?

---

## 🎯 Qualitätsanspruch

### Code Quality
- ✅ TypeScript strict mode
- ✅ Keine `any` types
- ✅ ESLint + Prettier
- ✅ Konsistente Namenskonventionen
- ✅ JSDoc für komplexe Funktionen

### Testing
- ✅ Unit Tests für Domain Logic (Pflicht!)
- ✅ Integration Tests für Use Cases
- ✅ E2E Tests für kritische User Flows

### Performance
- ✅ Server Components wo möglich
- ✅ Caching mit Vercel KV
- ✅ Optimistic Updates
- ✅ Lazy Loading
- ✅ Image Optimization

### Monitoring
- ✅ Vercel Analytics
- ✅ Error Tracking (Sentry?)
- ✅ Performance Monitoring
- ✅ Audit Logs

---

## 🚀 Start-Signal

**WICHTIG**: Ich führe KEINE Schritte aus, bis du es sagst!

Wenn du startest willst:
1. Kläre offene Fragen (siehe "Zu klären")
2. Sage explizit: "Starte mit Phase 1" oder ähnlich
3. Ich erkläre dann zuerst den Plan, dann implementieren wir Schritt für Schritt

---

**Status**: ✅ Kontext gespeichert, warte auf Start-Signal!
