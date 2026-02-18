/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // HSTS (nur in Production via Vercel automatisch)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // CSP: Restriktiv mit Umgebungs-Unterscheidung
          {
            key: 'Content-Security-Policy',
            value: process.env.NODE_ENV === 'production'
              ? [
                  "default-src 'self'",
                  // Next.js benötigt 'strict-dynamic' für inline scripts (nonce-basiert)
                  // Das erlaubt nur scripts, die von Next.js generiert werden
                  "script-src 'self' 'strict-dynamic'",
                  "style-src 'self' 'unsafe-inline'", // Tailwind benötigt inline styles
                  "img-src 'self' data: https:",
                  "font-src 'self' data:",
                  "connect-src 'self' https://jmmn7z.logto.app https://finnhub.io https://api.coingecko.com https://wertpapiere.ing.de",
                  "frame-ancestors 'none'",
                  "base-uri 'self'",
                  "form-action 'self'",
                  "upgrade-insecure-requests",
                ].join('; ')
              : [
                  // Dev: Erlaubter unsafe-eval für Hot Reload
                  "default-src 'self'",
                  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
                  "style-src 'self' 'unsafe-inline'",
                  "img-src 'self' data: https:",
                  "font-src 'self' data:",
                  "connect-src 'self' https://jmmn7z.logto.app https://finnhub.io https://api.coingecko.com https://wertpapiere.ing.de ws://localhost:*",
                  "frame-ancestors 'none'",
                  "base-uri 'self'",
                  "form-action 'self'",
                ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;

