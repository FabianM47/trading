# 📈 Trading Platform

A secure, modern trading platform built with Next.js 16, Auth.js v5, and Drizzle ORM.

## 🚀 Features

- ✅ **Authentication** - Auth.js v5 with Credentials & GitHub provider
- ✅ **Security** - CSRF protection, rate limiting, input sanitization
- ✅ **Database** - PostgreSQL with Drizzle ORM
- ✅ **Price Data** - Multi-provider abstraction (Finnhub)
- ✅ **Type Safety** - Full TypeScript, Zod validation
- ✅ **Testing** - Vitest unit tests
- ✅ **Deployment** - Vercel-ready with KV cache

## 📚 Documentation

**[→ Zur kompletten Dokumentation](./docs/README.md)**

### Quick Links:
- 🚀 [Setup Guide](./docs/setup/CONVENTIONS_SETUP.md)
- 🔒 [Security Guide](./docs/security/SECURITY_USAGE.md)
- 💾 [Database Design](./docs/database/DATABASE_DESIGN.md)
- ⚡ [Price Provider](./docs/features/PRICE_PROVIDER.md)
- 📖 [Project Context](./docs/PROJECT_CONTEXT.md)

## 🏃 Getting Started

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Setup Environment
```bash
cp .env.example .env.local
# Edit .env.local with your keys
```

### 3. Setup Database
```bash
pnpm db:push
pnpm db:seed
```

### 4. Run Development Server
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🧪 Testing

```bash
pnpm test          # Run tests
pnpm test:ui       # Test UI
pnpm test:coverage # Coverage report
```

## 📦 Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Auth:** Auth.js v5
- **Database:** PostgreSQL + Drizzle ORM
- **Cache:** Vercel KV (Redis)
- **Validation:** Zod
- **Testing:** Vitest
- **Deployment:** Vercel

## 📖 Documentation Structure

```
docs/
├── README.md              # Documentation overview
├── setup/                 # Setup & deployment guides
├── security/              # Security implementation
├── database/              # Database & schema docs
├── features/              # Feature documentation
├── PROJECT_CONTEXT.md     # Project overview
└── CONTRIBUTING.md        # Contribution guide
```

## 🔐 Security

See [Security Implementation Guide](./docs/security/SECURITY_IMPLEMENTATION.md) for details.

## 🚢 Deployment

See [Vercel Setup Guide](./docs/setup/VERCEL_SETUP.md) for deployment instructions.

## 🤝 Contributing

See [Contributing Guide](./docs/CONTRIBUTING.md) for contribution guidelines.

---

**Built with ❤️ using Next.js**
