# 🔐 Authentication Setup Guide

Complete Auth.js (NextAuth v5) implementation with Email Magic Links and Google OAuth.

---

## 📦 Installed Packages

```bash
pnpm add next-auth@beta @auth/drizzle-adapter @auth/core nodemailer
pnpm add -D @types/nodemailer
```

---

## 📁 File Structure

```
app/
├── api/auth/[...nextauth]/route.ts   # Auth API routes
├── auth/
│   ├── signin/page.tsx               # Sign-in page
│   └── verify-request/page.tsx       # Email sent confirmation
├── app/page.tsx                       # Protected app page (example)
└── layout.tsx                         # Root layout with AuthProvider

components/auth/
├── auth-provider.tsx                  # SessionProvider wrapper
├── user-button.tsx                    # User info + logout
└── sign-out-button.tsx                # Logout button

lib/auth/
├── server.ts                          # Server-side auth helpers
└── client.ts                          # Client-side auth hooks

db/
├── auth-schema.ts                     # Auth.js database tables
└── index.ts                           # Database client

middleware.ts                          # Route protection
auth.ts                                # Auth.js configuration
```

---

## 🗄️ Database Setup

### 1. Apply Auth Tables to Database

```bash
# Pull environment variables from Vercel
vercel env pull .env.local

# Run the auth schema migration
psql $POSTGRES_URL -f db/auth-schema.sql
```

### 2. Auth Schema (Already Created)

Tables created:
- `users` - User accounts
- `accounts` - OAuth accounts
- `sessions` - Active sessions
- `verification_tokens` - Magic link tokens
- `authenticators` - WebAuthn (future)

---

## ⚙️ Environment Variables

### Required (Always)

```bash
# Generate with: openssl rand -base64 32
AUTH_SECRET=your-secret-here

# Production URL (localhost for dev)
AUTH_URL=http://localhost:3000
```

### Email Magic Link (Optional)

```bash
# SMTP connection string
EMAIL_SERVER=smtp://user:password@smtp.gmail.com:587
EMAIL_FROM=noreply@trading.app
```

**Examples:**

#### Gmail
```bash
EMAIL_SERVER=smtp://your-email@gmail.com:your-app-password@smtp.gmail.com:587
```
> **Note**: Use [App Password](https://support.google.com/accounts/answer/185833), not your Gmail password

#### SendGrid
```bash
EMAIL_SERVER=smtp://apikey:YOUR_SENDGRID_API_KEY@smtp.sendgrid.net:587
```

#### Mailgun
```bash
EMAIL_SERVER=smtp://postmaster@your-domain.mailgun.org:YOUR_PASSWORD@smtp.mailgun.org:587
```

### Google OAuth (Optional)

```bash
AUTH_GOOGLE_ID=your-client-id
AUTH_GOOGLE_SECRET=your-client-secret
```

**Setup Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID
3. Add Authorized redirect URIs:
   - Dev: `http://localhost:3000/api/auth/callback/google`
   - Prod: `https://your-domain.com/api/auth/callback/google`

---

## 🚀 Usage Examples

### Server Component (RSC)

```tsx
import { requireAuth, getSession } from '@/lib/auth/server';

export default async function ProfilePage() {
  // Option 1: Require auth (auto-redirects)
  const user = await requireAuth();
  
  // Option 2: Check auth manually
  const session = await getSession();
  if (!session?.user) {
    redirect('/auth/signin');
  }
  
  return (
    <div>
      <h1>Welcome {user.name}</h1>
      <p>Email: {user.email}</p>
      <p>ID: {user.id}</p>
    </div>
  );
}
```

### Server Action

```tsx
'use server';

import { requireUserId } from '@/lib/auth/server';

export async function createPortfolio(data: FormData) {
  // Get authenticated user ID (or redirect)
  const userId = await requireUserId();
  
  // Create portfolio for this user
  const portfolio = await db.insert(portfolios).values({
    userId,
    name: data.get('name'),
  });
  
  return { success: true, portfolio };
}
```

### Client Component

```tsx
'use client';

import { useAuth, useRequireAuth } from '@/lib/auth/client';

export function ProfileButton() {
  const { data: session, status } = useAuth();
  
  if (status === 'loading') return <Spinner />;
  if (!session) return <SignInButton />;
  
  return (
    <div>
      <img src={session.user.image} />
      <span>{session.user.name}</span>
    </div>
  );
}

// Protected component (auto-redirects)
export function ProtectedPage() {
  const { user, isLoading } = useRequireAuth();
  
  if (isLoading) return <Spinner />;
  
  return <div>Hello {user.name}</div>;
}
```

### API Route

```tsx
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Fetch user data
  const data = await getUserData(session.user.id);
  
  return NextResponse.json({ data });
}
```

---

## 🛡️ Protected Routes

### Middleware Configuration

The middleware protects all `/app/*` and `/dashboard/*` routes:

```typescript
// middleware.ts
const protectedPaths = ['/app', '/dashboard'];
```

To add more protected routes:

```typescript
const protectedPaths = [
  '/app',
  '/dashboard',
  '/portfolio',
  '/trades',
  '/settings',
];
```

### Public Routes

These routes are accessible without authentication:

```typescript
const publicPaths = [
  '/',
  '/auth/signin',
  '/auth/signup',
  '/auth/error',
  '/auth/verify-request',
  '/api/auth',
];
```

---

## 🎨 Custom Sign-In Page

The sign-in page (`app/auth/signin/page.tsx`) is fully customizable:

### Features:
- ✅ Email Magic Link form
- ✅ Google OAuth button
- ✅ Error handling
- ✅ Callback URL support
- ✅ Trade Republic-inspired design

### Customization:

```tsx
// Change colors
const brandColor = '#00D395'; // Your brand color

// Change redirect after sign-in
const callbackUrl = searchParams.callbackUrl || '/dashboard';

// Add more OAuth providers
// ... add Facebook, GitHub, etc.
```

---

## 📧 Email Templates

Email templates are in `auth.ts`:

### Customize Email

```typescript
function html({ url, host }: { url: string; host: string }) {
  // Change colors
  const brandColor = '#00D395';
  
  // Customize HTML
  return `
    <!DOCTYPE html>
    <html>
      <body>
        <h1>Sign in to ${host}</h1>
        <a href="${url}">Click here</a>
      </body>
    </html>
  `;
}
```

### Test Email Locally

Use [Ethereal Email](https://ethereal.email/) for testing:

```bash
# Generate test SMTP credentials at ethereal.email
EMAIL_SERVER=smtp://username:password@smtp.ethereal.email:587
EMAIL_FROM=test@ethereal.email
```

---

## 🔧 Common Issues

### "Configuration" Error

**Problem**: Missing `AUTH_SECRET` or `AUTH_URL`

**Solution**:
```bash
# Generate secret
openssl rand -base64 32

# Add to .env.local
AUTH_SECRET=<generated-secret>
AUTH_URL=http://localhost:3000
```

### Email Not Sending

**Problem**: SMTP connection failed

**Solutions**:
1. Check SMTP credentials
2. Enable "Less secure app access" (Gmail)
3. Use App Password instead of real password
4. Check firewall/network

### Google OAuth Error

**Problem**: "redirect_uri_mismatch"

**Solution**: Add correct redirect URI in Google Console:
- Dev: `http://localhost:3000/api/auth/callback/google`
- Prod: `https://your-domain.com/api/auth/callback/google`

### Session Not Persisting

**Problem**: Session expires immediately

**Solution**: Check database tables are created:
```sql
SELECT * FROM sessions;
SELECT * FROM users;
```

---

## 📊 Database Sessions vs JWT

Current configuration: **Database Sessions** ✅

### Advantages:
- ✅ Revocable sessions (instant logout)
- ✅ Multi-device tracking
- ✅ Better security
- ✅ Audit trail

### To Switch to JWT:

```typescript
// auth.ts
session: {
  strategy: 'jwt', // Change to JWT
  maxAge: 30 * 24 * 60 * 60,
}
```

---

## 🚀 Deployment to Vercel

### 1. Set Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

```bash
AUTH_SECRET=<generate-with-openssl>
AUTH_URL=https://your-domain.vercel.app

# Email (optional)
EMAIL_SERVER=smtp://...
EMAIL_FROM=noreply@your-domain.com

# Google OAuth (optional)
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
```

### 2. Deploy

```bash
git add .
git commit -m "feat: Add Auth.js authentication"
git push origin main
```

### 3. Run Database Migrations

```bash
vercel env pull .env.local
psql $POSTGRES_URL -f db/auth-schema.sql
```

---

## 🔐 Security Best Practices

### 1. Use Strong Secrets

```bash
# Generate strong secrets
openssl rand -base64 32
```

### 2. Enable HTTPS in Production

```typescript
// auth.ts (automatically handled by Vercel)
useSecureCookies: process.env.NODE_ENV === 'production',
```

### 3. Set Secure Cookies

Already configured:
- `httpOnly: true` - JavaScript can't access
- `secure: true` - HTTPS only (prod)
- `sameSite: 'lax'` - CSRF protection

### 4. Session Expiry

```typescript
session: {
  maxAge: 30 * 24 * 60 * 60, // 30 days
  updateAge: 24 * 60 * 60,    // Update every 24h
}
```

### 5. Email Link Expiry

```typescript
Nodemailer({
  maxAge: 10 * 60, // 10 minutes
})
```

---

## 📚 API Reference

### Server Functions

```typescript
// lib/auth/server.ts
await getSession()              // Get session or null
await getCurrentUser()          // Get user or null
await requireAuth()             // Get user or redirect
await isAuth()                  // Boolean check
await getUserId()               // Get user ID or null
await requireUserId()           // Get user ID or redirect
```

### Client Hooks

```typescript
// lib/auth/client.ts
useAuth()                       // Get session + status
useCurrentUser()                // Get user + loading state
useRequireAuth()                // Get user or redirect
useIsAuth()                     // Boolean check
```

### Auth Functions

```typescript
// auth.ts
import { signIn, signOut, auth } from '@/auth';

await signIn('google')          // OAuth sign-in
await signIn('nodemailer', { email })  // Email sign-in
await signOut()                 // Sign out
await auth()                    // Get session (server-side)
```

---

## 🚀 Development Mode - Auth Bypass

Für schnellere Entwicklung können Sie die Authentifizierung umgehen:

**Siehe: [Auth Bypass Guide](./AUTH_BYPASS.md)**

```bash
# In .env.local
DISABLE_AUTH=true
```

Dies verwendet einen Mock-User und überspringt alle Auth-Checks. Perfekt für:
- Feature-Entwicklung ohne Login
- Component Testing
- Schnelles Prototyping

**⚠️ Nur für Entwicklung! Niemals in Produktion verwenden!**

---

## ✅ Testing Checklist

- [ ] Email Magic Link works
- [ ] Google OAuth works
- [ ] Sign out works
- [ ] Protected routes redirect unauthenticated users
- [ ] Session persists across page reloads
- [ ] User info displays correctly
- [ ] Database sessions are created
- [ ] Email templates render correctly

---

**Authentication is fully configured! 🎉**

Next steps:
1. Set up environment variables
2. Run database migrations
3. Test sign-in flow
4. Deploy to Vercel
