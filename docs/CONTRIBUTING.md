# Contributing Guidelines

Willkommen! Diese Datei beschreibt die Code-Konventionen, Best Practices und Workflows für das Trading-Projekt.

## 📋 Inhaltsverzeichnis

- [Tech Stack & Konventionen](#tech-stack--konventionen)
- [Code Style](#code-style)
- [Project Structure](#project-structure)
- [Git Workflow](#git-workflow)
- [Pull Request Checkliste](#pull-request-checkliste)

---

## 🛠️ Tech Stack & Konventionen

### Core Stack
- **Next.js 16** mit App Router
- **TypeScript** mit `strict` Mode
- **React 19** mit Server Components als Standard
- **Tailwind CSS** für Styling
- **pnpm** als Package Manager

### Validation & Forms
- ✅ **Zod** für alle Schema-Validierungen
- ✅ **React Hook Form** für Formulare
- ✅ **@hookform/resolvers** für Zod-Integration

### UI & Components
- ✅ **shadcn/ui** als Component Library
- ✅ **TanStack Table** für Daten-Tabellen mit Filtering/Sorting
- ✅ Client Components nur wenn nötig (Interaktivität)

### Server-Side
- ✅ **Route Handlers** (`app/api/*/route.ts`) für API Endpoints
- ✅ **Server Actions** nur für Formular-Submissions und Mutations
- ✅ Keine Server Actions für reine Daten-Fetches (nutze Route Handlers)

### Database & Storage
- ✅ **Vercel Postgres** für relationale Daten
- ✅ **Vercel KV (Redis)** für Caching und Sessions
- ✅ Type-safe Queries (z.B. mit Prisma oder Drizzle)

---

## 💻 Code Style

### TypeScript Strict Mode

**Immer aktiviert!** Alle diese Regeln gelten:
```typescript
// ✅ Explizite Typen für Function Parameters
function calculateProfit(amount: number, percentage: number): number {
  return amount * (percentage / 100);
}

// ✅ Keine impliziten 'any' Types
// ❌ Bad
const data = await fetchData();

// ✅ Good
const data: TradingData = await fetchData();

// ✅ Null-Checks erforderlich
// ❌ Bad
const price = data.price.toFixed(2);

// ✅ Good
const price = data?.price?.toFixed(2) ?? '0.00';
```

### Zod Schemas

Alle Daten-Validierungen mit Zod:

```typescript
// lib/schemas/trading.schema.ts
import { z } from 'zod';

export const tradeOrderSchema = z.object({
  symbol: z.string().min(1, 'Symbol erforderlich'),
  amount: z.number().positive('Menge muss positiv sein'),
  type: z.enum(['buy', 'sell']),
  price: z.number().positive().optional(),
});

export type TradeOrder = z.infer<typeof tradeOrderSchema>;
```

**Verwendung:**

```typescript
// In Route Handlers
import { tradeOrderSchema } from '@/lib/schemas/trading.schema';

export async function POST(request: Request) {
  const body = await request.json();
  const result = tradeOrderSchema.safeParse(body);
  
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.flatten() },
      { status: 400 }
    );
  }
  
  const order = result.data;
  // ... process order
}
```

### React Hook Form

Standard für alle Formulare:

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tradeOrderSchema, type TradeOrder } from '@/lib/schemas/trading.schema';

export function TradeForm() {
  const form = useForm<TradeOrder>({
    resolver: zodResolver(tradeOrderSchema),
    defaultValues: {
      symbol: '',
      amount: 0,
      type: 'buy',
    },
  });

  const onSubmit = async (data: TradeOrder) => {
    // Submit to API or Server Action
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

### Server Components vs Client Components

**Default: Server Components**

```typescript
// ✅ Server Component (default)
// app/dashboard/page.tsx
export default async function DashboardPage() {
  const data = await fetchTradingData();
  return <DashboardView data={data} />;
}

// ✅ Client Component (nur wenn nötig)
// components/interactive-chart.tsx
'use client';

import { useState } from 'react';

export function InteractiveChart({ data }: Props) {
  const [period, setPeriod] = useState('1d');
  // ... interactive logic
}
```

**Wann Client Components?**
- ✅ Event Handlers (`onClick`, `onChange`)
- ✅ State Management (`useState`, `useReducer`)
- ✅ Effects (`useEffect`)
- ✅ Browser APIs (localStorage, window)
- ✅ React Hook Form

### Route Handlers vs Server Actions

**Route Handlers (`app/api/*/route.ts`):**
- ✅ GET Requests (Daten abrufen)
- ✅ Externe API Integration
- ✅ Webhooks
- ✅ RESTful APIs
- ✅ Cron Jobs

```typescript
// app/api/trades/route.ts
export async function GET(request: Request) {
  const data = await db.query('SELECT * FROM trades');
  return NextResponse.json(data);
}
```

**Server Actions:**
- ✅ Form Submissions
- ✅ Mutations (Create, Update, Delete)
- ✅ Direkt in Server Components

```typescript
// app/actions/trade.actions.ts
'use server';

import { revalidatePath } from 'next/cache';

export async function createTrade(formData: FormData) {
  const result = tradeOrderSchema.safeParse({
    symbol: formData.get('symbol'),
    amount: Number(formData.get('amount')),
    type: formData.get('type'),
  });

  if (!result.success) {
    return { error: 'Validation failed' };
  }

  await db.insert('trades', result.data);
  revalidatePath('/dashboard');
  return { success: true };
}
```

### TanStack Table

Standard für alle Daten-Tabellen:

```typescript
'use client';

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type ColumnDef,
} from '@tanstack/react-table';

const columns: ColumnDef<Trade>[] = [
  {
    accessorKey: 'symbol',
    header: 'Symbol',
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
  },
];

export function TradesTable({ data }: { data: Trade[] }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // ... render table
}
```

---

## 📁 Project Structure

```
trading/
├── app/
│   ├── (auth)/              # Route Groups für Auth
│   ├── (dashboard)/         # Route Groups für Dashboard
│   ├── api/                 # API Route Handlers
│   │   ├── trades/route.ts
│   │   └── cron/
│   ├── actions/             # Server Actions
│   │   └── trade.actions.ts
│   └── layout.tsx
│
├── components/
│   ├── ui/                  # shadcn/ui Components
│   ├── forms/               # Form Components
│   ├── tables/              # Table Components
│   └── features/            # Feature-spezifische Components
│
├── lib/
│   ├── schemas/             # Zod Schemas
│   │   └── trading.schema.ts
│   ├── utils.ts             # Utility Functions
│   ├── database.ts          # DB Client
│   └── redis.ts             # Redis Client
│
├── server/
│   ├── services/            # Business Logic
│   └── repositories/        # Data Access Layer
│
└── db/
    ├── schema.sql           # Database Schema
    └── migrations/          # DB Migrations
```

**Naming Conventions:**
- **Dateien**: `kebab-case.tsx` (z.B. `trade-form.tsx`)
- **Components**: `PascalCase` (z.B. `TradeForm`)
- **Functions**: `camelCase` (z.B. `calculateProfit`)
- **Constants**: `UPPER_SNAKE_CASE` (z.B. `MAX_TRADES`)
- **Types/Interfaces**: `PascalCase` (z.B. `TradeOrder`, `UserProfile`)

---

## 🌿 Git Workflow

### Branch Naming

```bash
feature/add-trade-history    # Neue Features
fix/chart-rendering-bug      # Bug Fixes
refactor/api-structure       # Refactoring
docs/update-readme           # Dokumentation
chore/update-dependencies    # Maintenance
```

### Commit Messages

Folge [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat: Add trade history page
fix: Fix chart rendering on mobile
refactor: Optimize database queries
docs: Update API documentation
chore: Update dependencies
style: Format code with prettier
test: Add unit tests for trade service
```

**Format:**
```
<type>: <subject>

[optional body]

[optional footer]
```

**Types:**
- `feat`: Neue Features
- `fix`: Bug Fixes
- `refactor`: Code-Änderungen ohne Feature/Fix
- `docs`: Dokumentation
- `style`: Code-Formatierung
- `test`: Tests hinzufügen/ändern
- `chore`: Build, Config, Dependencies

### Development Workflow

1. **Neuen Branch erstellen:**
```bash
git checkout -b feature/add-trade-filter
```

2. **Entwickeln und committen:**
```bash
git add .
git commit -m "feat: Add trade filter component"
```

3. **Push und PR erstellen:**
```bash
git push origin feature/add-trade-filter
```

4. **Pull Request auf GitHub erstellen**

---

## ✅ Pull Request Checkliste

Bevor du einen PR erstellst, stelle sicher:

### Code Quality
- [ ] TypeScript hat keine Fehler (`pnpm build`)
- [ ] ESLint zeigt keine Fehler (`pnpm lint`)
- [ ] Alle neuen Komponenten sind typsicher
- [ ] Zod Schemas für alle Input-Validierungen

### Functionality
- [ ] Code funktioniert lokal ohne Fehler (`pnpm dev`)
- [ ] Alle Forms validieren korrekt
- [ ] API Endpoints sind geschützt (Authorization)
- [ ] Error Handling implementiert

### Best Practices
- [ ] Server Components wo möglich
- [ ] Client Components nur mit `'use client'` wenn nötig
- [ ] Route Handlers für GET Requests
- [ ] Server Actions nur für Mutations
- [ ] Keine hardcoded Secrets (nutze Environment Variables)

### UI/UX
- [ ] Responsive Design (Mobile, Tablet, Desktop)
- [ ] Loading States implementiert
- [ ] Error States implementiert
- [ ] Accessibility beachtet (ARIA labels, keyboard navigation)

### Testing
- [ ] Manuell getestet in Chrome/Firefox/Safari
- [ ] Edge Cases getestet (leere Daten, Fehler, etc.)
- [ ] Cron Jobs getestet (falls relevant)

### Documentation
- [ ] Code ist selbsterklärend oder kommentiert
- [ ] Komplexe Logik hat JSDoc Comments
- [ ] README aktualisiert (falls nötig)
- [ ] CHANGELOG aktualisiert (falls nötig)

### Git
- [ ] Branch ist aktuell mit `main` (`git merge main`)
- [ ] Commits folgen Conventional Commits
- [ ] Keine Merge Conflicts
- [ ] `.env` Dateien nicht committet

### PR Beschreibung

Füge diese Informationen in deinen PR ein:

```markdown
## 📝 Beschreibung
Kurze Beschreibung der Änderungen

## 🎯 Typ der Änderung
- [ ] Bug Fix
- [ ] Neues Feature
- [ ] Breaking Change
- [ ] Dokumentation
- [ ] Refactoring

## 🧪 Wie wurde getestet?
Beschreibe deine Tests

## 📸 Screenshots (falls UI-Änderungen)
Füge Screenshots hinzu

## 📋 Checkliste
Siehe oben ☝️
```

---

## 🎨 Code Examples

### Vollständiges Beispiel: Trade Form

```typescript
// lib/schemas/trading.schema.ts
import { z } from 'zod';

export const tradeOrderSchema = z.object({
  symbol: z.string().min(1, 'Symbol ist erforderlich').max(10),
  amount: z.number().positive('Menge muss positiv sein'),
  type: z.enum(['buy', 'sell'], {
    errorMap: () => ({ message: 'Type muss buy oder sell sein' }),
  }),
  price: z.number().positive().optional(),
});

export type TradeOrder = z.infer<typeof tradeOrderSchema>;
```

```typescript
// app/actions/trade.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { tradeOrderSchema } from '@/lib/schemas/trading.schema';

export async function createTradeOrder(data: unknown) {
  const result = tradeOrderSchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      error: result.error.flatten().fieldErrors,
    };
  }

  try {
    // Save to database
    // await db.trades.create(result.data);

    revalidatePath('/dashboard/trades');
    return { success: true };
  } catch (error) {
    console.error('Failed to create trade:', error);
    return {
      success: false,
      error: { _form: ['Failed to create trade'] },
    };
  }
}
```

```typescript
// components/forms/trade-form.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tradeOrderSchema, type TradeOrder } from '@/lib/schemas/trading.schema';
import { createTradeOrder } from '@/app/actions/trade.actions';

export function TradeForm() {
  const form = useForm<TradeOrder>({
    resolver: zodResolver(tradeOrderSchema),
    defaultValues: {
      symbol: '',
      amount: 0,
      type: 'buy',
    },
  });

  const onSubmit = async (data: TradeOrder) => {
    const result = await createTradeOrder(data);

    if (!result.success) {
      // Handle errors
      console.error(result.error);
    } else {
      // Success
      form.reset();
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* Form implementation with shadcn/ui components */}
    </form>
  );
}
```

---

## 🚀 Quick Start Checklist

Für neue Contributors:

1. [ ] Repository clonen
2. [ ] `pnpm install` ausführen
3. [ ] `.env.local` erstellen (siehe `.env.example`)
4. [ ] `pnpm dev` starten
5. [ ] Diese Guidelines lesen 📖
6. [ ] Ersten Branch erstellen
7. [ ] Code schreiben & PR erstellen! 🎉

---

## 📚 Ressourcen

- [Next.js Docs](https://nextjs.org/docs)
- [React Hook Form Docs](https://react-hook-form.com/)
- [Zod Documentation](https://zod.dev/)
- [TanStack Table Docs](https://tanstack.com/table/latest)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

**Fragen?** Erstelle ein Issue oder frage im Team! 💬
