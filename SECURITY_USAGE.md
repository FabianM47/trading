# 🔒 Security Implementation Guide

## 📋 Quick Start

This guide shows you how to use all security features in your API routes.

---

## 🚀 1. Rate Limiting

### Basic Usage:

```typescript
// app/api/example/route.ts
import { withRateLimit } from '@/lib/security/rate-limit-middleware';
import { NextResponse } from 'next/server';

async function handleRequest(request: NextRequest) {
  return NextResponse.json({ message: 'Success' });
}

// Apply rate limiting with preset
export const POST = withRateLimit(handleRequest, {
  type: 'AUTHENTICATED', // 100 req/min
});
```

### Available Presets:

```typescript
RATE_LIMITS = {
  AUTH: { limit: 5, window: 900 },              // 5 req/15min (login/signup)
  ANONYMOUS: { limit: 10, window: 60 },         // 10 req/min (unauthenticated)
  AUTHENTICATED: { limit: 100, window: 60 },    // 100 req/min (logged in)
  EXTERNAL_API: { limit: 60, window: 60 },      // 60 req/min (stock API)
  TRADE_CREATION: { limit: 20, window: 60 },    // 20 req/min (prevent duplicates)
  SEARCH: { limit: 30, window: 60 },            // 30 req/min (expensive queries)
}
```

### Custom Rate Limit:

```typescript
export const POST = withRateLimit(handleRequest, {
  custom: {
    limit: 5,
    window: 300, // 5 minutes
  },
});
```

### Custom Identifier:

```typescript
export const POST = withRateLimit(handleRequest, {
  type: 'AUTHENTICATED',
  getIdentifier: async (req) => {
    // Rate limit by user email instead of user ID
    const session = await auth();
    return session?.user?.email || getClientIp(req);
  },
});
```

### Convenience Wrappers:

```typescript
import { 
  withAuthRateLimit,         // Strict rate limit for auth endpoints
  withTradeRateLimit,        // For trade creation
  withSearchRateLimit,       // For search endpoints
} from '@/lib/security/rate-limit-middleware';

export const POST = withAuthRateLimit(handleRequest);
export const POST = withTradeRateLimit(handleRequest);
export const GET = withSearchRateLimit(handleRequest);
```

---

## 🛡️ 2. CSRF Protection

### Basic Usage:

```typescript
import { withCsrf } from '@/lib/security/csrf';

async function handleRequest(request: NextRequest) {
  return NextResponse.json({ message: 'Success' });
}

// Apply CSRF protection
export const POST = withCsrf(handleRequest);
```

### Manual Verification:

```typescript
import { verifyCsrf } from '@/lib/security/csrf';

export async function POST(request: NextRequest) {
  // Manual CSRF check
  const csrfCheck = verifyCsrf(request);
  
  if (!csrfCheck.valid) {
    return NextResponse.json(
      { error: csrfCheck.reason },
      { status: 403 }
    );
  }
  
  // Continue with request handling
}
```

**Note:** Server Actions have built-in CSRF protection. Only use this for API routes.

---

## ✅ 3. Input Validation (Zod)

### Using Existing Schemas:

```typescript
import { createTradeRequestSchema } from '@/lib/schemas/trading.schema';
import { ValidationError } from '@/lib/errors/AppError';

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // Validate with Zod
  const validation = createTradeRequestSchema.safeParse(body);
  
  if (!validation.success) {
    throw new ValidationError('Invalid input', {
      errors: validation.error.format(),
    });
  }
  
  // Use validated data
  const tradeData = validation.data;
  // ...
}
```

### Available Schemas:

```typescript
import {
  createTradeRequestSchema,       // For creating trades
  updateTradeRequestSchema,       // For updating trades
  instrumentSearchRequestSchema,  // For searching instruments
  groupAssignRequestSchema,       // For assigning groups
  tradeFiltersSchema,             // For filtering trades
  positionFiltersSchema,          // For filtering positions
  dateRangeSchema,                // For date ranges
  paginationSchema,               // For pagination
} from '@/lib/schemas/trading.schema';
```

---

## 📝 4. Audit Logging

### Log Authentication Events:

```typescript
import { logAuthEvent } from '@/lib/security/audit-log';

// Successful login
await logAuthEvent('login', {
  userId: user.id,
  userEmail: user.email,
  ipAddress: getClientIp(request),
  userAgent: request.headers.get('user-agent') || undefined,
  success: 'true',
});

// Failed login
await logAuthEvent('failed_login', {
  userEmail: email,
  ipAddress: getClientIp(request),
  success: 'false',
  errorMessage: 'Invalid credentials',
});
```

### Log Trade Events:

```typescript
import { logTradeEvent } from '@/lib/security/audit-log';

await logTradeEvent('create', {
  userId: user.id,
  userEmail: user.email,
  ipAddress: getClientIp(request),
  metadata: {
    tradeId: trade.id,
    instrumentId: trade.instrumentId,
    tradeType: trade.tradeType,
    quantity: trade.quantity,
  },
  success: 'true',
});
```

### Log Security Events:

```typescript
import { logSecurityEvent } from '@/lib/security/audit-log';

// Rate limit exceeded
await logSecurityEvent('rate_limit_exceeded', {
  ipAddress: getClientIp(request),
  metadata: {
    endpoint: '/api/trades',
    limit: 10,
    window: 60,
  },
});

// CSRF failed
await logSecurityEvent('csrf_failed', {
  ipAddress: getClientIp(request),
  requestPath: request.nextUrl.pathname,
});
```

### Generic Audit Log:

```typescript
import { logAuditEvent } from '@/lib/security/audit-log';

await logAuditEvent({
  event: 'custom.event',
  category: 'custom',
  action: 'custom_action',
  userId: user.id,
  metadata: { key: 'value' },
});
```

### Extract Request Metadata:

```typescript
import { extractRequestMetadata } from '@/lib/security/audit-log';

const requestMeta = extractRequestMetadata(request);
// Returns: { ipAddress, userAgent, requestPath, requestMethod }

await logAuditEvent({
  event: 'user.action',
  category: 'user',
  action: 'update',
  ...requestMeta,
});
```

---

## ❌ 5. Error Handling

### Using Custom Error Classes:

```typescript
import { 
  ValidationError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  InternalServerError,
} from '@/lib/errors/AppError';

// Validation error
throw new ValidationError('Invalid email format');

// Authentication error
throw new AuthenticationError('Please log in');

// Not found error
throw new NotFoundError('Trade', tradeId);

// Rate limit error
throw new RateLimitError(60); // retry after 60 seconds

// Internal server error
throw new InternalServerError('Database connection failed');
```

### Global Error Handler Pattern:

```typescript
import { errorToResponse } from '@/lib/errors/AppError';

export async function POST(request: NextRequest) {
  try {
    // Your logic here
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Request error:', error);
    
    const errorResponse = errorToResponse(error);
    return NextResponse.json(
      { success: false, ...errorResponse },
      { status: errorResponse.statusCode }
    );
  }
}
```

---

## 🔐 6. Authentication Check

### Server Components:

```typescript
import { requireAuth, getCurrentUser } from '@/lib/auth/server';

// Redirect if not authenticated
const user = await requireAuth();

// Or get user (returns null if not authenticated)
const user = await getCurrentUser();
if (!user) {
  redirect('/auth/signin');
}
```

### API Routes:

```typescript
import { auth } from '@/auth';

export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new AuthenticationError();
  }
  
  const userId = session.user.id;
  // ...
}
```

### Client Components:

```typescript
'use client';
import { useRequireAuth, useCurrentUser } from '@/lib/auth/client';

export default function ProtectedComponent() {
  // Auto-redirects if not authenticated
  useRequireAuth();
  
  // Or manually check
  const { user, isLoading } = useCurrentUser();
  
  if (isLoading) return <LoadingSpinner />;
  if (!user) return <SignInPrompt />;
  
  return <div>Hello {user.name}</div>;
}
```

---

## 🎯 7. Complete API Route Example

```typescript
// app/api/trades/route.ts
import { auth } from '@/auth';
import { 
  ValidationError, 
  AuthenticationError,
  errorToResponse 
} from '@/lib/errors/AppError';
import { 
  logTradeEvent, 
  logSecurityEvent,
  extractRequestMetadata 
} from '@/lib/security/audit-log';
import { withCsrf } from '@/lib/security/csrf';
import { withRateLimit } from '@/lib/security/rate-limit-middleware';
import { createTradeRequestSchema } from '@/lib/schemas/trading.schema';
import { NextRequest, NextResponse } from 'next/server';

// Handler function
async function handleCreateTrade(request: NextRequest) {
  try {
    // 1. Authentication
    const session = await auth();
    if (!session?.user?.id) {
      await logSecurityEvent('unauthorized_access', {
        ...extractRequestMetadata(request),
      });
      throw new AuthenticationError();
    }

    // 2. Validation
    const body = await request.json();
    const validation = createTradeRequestSchema.safeParse(body);
    
    if (!validation.success) {
      throw new ValidationError('Invalid trade data', {
        errors: validation.error.format(),
      });
    }

    // 3. Business Logic
    const tradeData = validation.data;
    // TODO: Create trade in database
    const trade = { id: crypto.randomUUID(), ...tradeData };

    // 4. Audit Log
    await logTradeEvent('create', {
      userId: session.user.id,
      userEmail: session.user.email || undefined,
      ...extractRequestMetadata(request),
      metadata: { tradeId: trade.id },
      success: 'true',
    });

    // 5. Response
    return NextResponse.json({ success: true, data: trade }, { status: 201 });

  } catch (error) {
    console.error('Trade creation error:', error);
    
    // Log error
    const session = await auth();
    await logTradeEvent('create', {
      userId: session?.user?.id,
      ...extractRequestMetadata(request),
      success: 'false',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    // Return error response
    const errorResponse = errorToResponse(error);
    return NextResponse.json(
      { success: false, ...errorResponse },
      { status: errorResponse.statusCode }
    );
  }
}

// Apply middleware: Rate limiting + CSRF protection
export const POST = withRateLimit(
  withCsrf(handleCreateTrade),
  { type: 'TRADE_CREATION' }
);
```

---

## 📊 8. Environment Variables

Add to `.env.local`:

```bash
# Redis (Vercel KV) for Rate Limiting
KV_REST_API_URL=https://your-kv-url.vercel-storage.com
KV_REST_API_TOKEN=your-kv-token

# Auth (already configured)
AUTH_SECRET=your-secret
AUTH_URL=http://localhost:3000
```

Get Vercel KV credentials:
1. Go to Vercel Dashboard
2. Storage → KV → Create Database
3. Copy environment variables

---

## 🧪 9. Testing Rate Limiting

```bash
# Test rate limit (should succeed first 10 times, then fail)
for i in {1..15}; do
  curl -X POST http://localhost:3000/api/trades \
    -H "Content-Type: application/json" \
    -d '{"quantity": 10}'
  echo ""
done
```

Check response headers:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1708000000
```

---

## 📝 10. Security Checklist

Before deploying:

- [ ] All API routes have rate limiting
- [ ] All mutating routes (POST/PUT/DELETE) have CSRF protection
- [ ] All inputs are validated with Zod
- [ ] All critical actions are logged to audit_logs
- [ ] Authentication is required for protected routes
- [ ] Error messages don't leak sensitive data
- [ ] Environment variables are set in Vercel
- [ ] Database migrations are run (auth + audit schemas)

---

## 🚨 Common Issues

### "Edge runtime does not support Node.js modules"
→ Add `export const runtime = 'nodejs';` to middleware.ts

### "Cannot find module '@vercel/kv'"
→ Run: `pnpm add @vercel/kv`

### "Rate limit always passes"
→ Check Vercel KV environment variables are set

### "CSRF check always fails"
→ Check `AUTH_URL` matches your domain

---

## 📚 Additional Resources

- [Rate Limiting Best Practices](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Zod Documentation](https://zod.dev/)
- [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)

---

**Last Updated:** 2026-02-13  
**Version:** 1.0.0
