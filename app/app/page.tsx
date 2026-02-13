/**
 * Protected App Page (Example)
 * 
 * This page is only accessible to authenticated users
 * Middleware redirects unauthenticated users to /auth/signin
 */

import { UserButton } from '@/components/auth/user-button';
import { requireAuth } from '@/lib/auth/server';

export default async function AppPage() {
  // Get authenticated user (or redirect to signin)
  const user = await requireAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Trading Platform</h1>
          <UserButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Welcome back, {user.name || user.email}!
          </h2>

          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">
                🎉 Authentication Working!
              </h3>
              <p className="text-sm text-green-700">
                You are now signed in and this page is protected by middleware.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">
                Your Profile
              </h3>
              <dl className="text-sm space-y-2">
                <div className="flex justify-between">
                  <dt className="text-blue-700">ID:</dt>
                  <dd className="text-blue-900 font-mono">{user.id}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-blue-700">Email:</dt>
                  <dd className="text-blue-900">{user.email}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-blue-700">Name:</dt>
                  <dd className="text-blue-900">{user.name || 'Not set'}</dd>
                </div>
              </dl>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                Next Steps
              </h3>
              <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside">
                <li>Create your first portfolio</li>
                <li>Add instruments to track</li>
                <li>Record your trades</li>
                <li>View performance analytics</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
