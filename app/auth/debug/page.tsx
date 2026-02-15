/**
 * Auth Debug Page (Development only)
 * 
 * Shows current auth configuration for debugging
 */

import { auth } from '@/auth';

export default async function AuthDebugPage() {
  const session = await auth();

  const config = {
    'AUTH_URL': process.env.AUTH_URL || 'not set',
    'AUTH_GOOGLE_ID': process.env.AUTH_GOOGLE_ID ? '✓ set' : '✗ not set',
    'AUTH_GOOGLE_SECRET': process.env.AUTH_GOOGLE_SECRET ? '✓ set' : '✗ not set',
    'AUTH_SECRET': process.env.AUTH_SECRET ? '✓ set' : '✗ not set',
    'POSTGRES_URL': process.env.POSTGRES_URL ? '✓ set' : '✗ not set',
    'NODE_ENV': process.env.NODE_ENV,
    'VERCEL_ENV': process.env.VERCEL_ENV || 'not on Vercel',
    'VERCEL_URL': process.env.VERCEL_URL || 'not on Vercel',
  };

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-gray-600">Debug page is only available in development</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
          Auth Debug Information
        </h1>

        {/* Session Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Current Session
          </h2>
          {session ? (
            <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-x-auto text-sm">
              {JSON.stringify(session, null, 2)}
            </pre>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">Not authenticated</p>
          )}
        </div>

        {/* Environment Variables */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Environment Variables
          </h2>
          <div className="space-y-2">
            {Object.entries(config).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="font-mono text-sm text-gray-700 dark:text-gray-300">{key}</span>
                <span className={`font-mono text-sm ${value.includes('✓') ? 'text-green-600 dark:text-green-400' :
                    value.includes('✗') ? 'text-red-600 dark:text-red-400' :
                      'text-gray-600 dark:text-gray-400'
                  }`}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Auth Routes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Auth Routes
          </h2>
          <div className="space-y-2">
            <div className="font-mono text-sm">
              <a href="/api/auth/signin" className="text-blue-600 dark:text-blue-400 hover:underline">
                /api/auth/signin
              </a>
            </div>
            <div className="font-mono text-sm">
              <a href="/api/auth/signout" className="text-blue-600 dark:text-blue-400 hover:underline">
                /api/auth/signout
              </a>
            </div>
            <div className="font-mono text-sm">
              <a href="/api/auth/session" className="text-blue-600 dark:text-blue-400 hover:underline">
                /api/auth/session
              </a>
            </div>
            <div className="font-mono text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                /api/auth/callback/google
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
