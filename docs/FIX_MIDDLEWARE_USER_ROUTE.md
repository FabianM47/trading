# Middleware Fix - /api/logto/user Zugriff

## Problem
`RequireAuth` Component ruft `/api/logto/user` auf, bevor User authentifiziert ist.
→ Middleware blockierte dies → Redirect Loop → "Failed to fetch"

## Root Cause
Middleware hatte nur spezifische `/api/logto/*` Routen in `publicPaths`:
```typescript
const publicPaths = [
  '/api/logto/sign-in',
  '/api/logto/sign-out',
  '/api/logto/callback',
  // '/api/logto/user' fehlte! ❌
];
```

## Fix
Alle `/api/logto/*` Routes sind jetzt public (self-managed auth):

```typescript
// Alle /api/logto/* Routes sind public (self-managed auth)
if (pathname.startsWith('/api/logto/')) {
  return NextResponse.next();
}
```

**Begründung:**
- `/api/logto/user` muss **vor** Auth-Check erreichbar sein (prüft selbst Auth-Status)
- `/api/logto/sign-in|sign-out` sind Auth-Flow-Routes (müssen public sein)
- Alle anderen `/api/logto/*` future Routes sind ebenfalls Auth-related

## Security Check
✅ `/api/logto/user` gibt bei nicht-authentifiziert 401 zurück (siehe route.ts)
✅ Kein Security-Risk: Route leaked keine Daten, nur Auth-Status
✅ Middleware schützt weiterhin `/api/quotes` und `/me`

## Test
```bash
# 1. Start Dev Server
npm run dev

# 2. Öffne http://localhost:3000
# 3. Erwartung:
#    - AuthButton zeigt "Login"
#    - Kein "Failed to fetch" Error
#    - useAuth() funktioniert in RequireAuth
```

## Betroffene Dateien
- `middleware.ts` - Public Paths erweitert
- `app/api/logto/user/route.ts` - Unverändet (hat eigenen Auth-Check)
- `components/auth/RequireAuth.tsx` - Unverändet (kann jetzt /user aufrufen)
