/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Service Worker muss mit korrektem Scope und Cache-Control ausgeliefert werden
        source: '/sw.js',
        headers: [
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
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
          // CSP wird via Middleware gesetzt (nonce-basiert für Next.js App Router)
        ],
      },
    ];
  },
};

export default nextConfig;

