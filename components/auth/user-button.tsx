/**
 * User Button Component
 * 
 * Shows user info and logout button
 * Can be used in Server or Client Components
 */

import { getSession } from '@/lib/auth/server';
import { SignOutButton } from './sign-out-button';

export async function UserButton() {
  const session = await getSession();

  if (!session?.user) {
    return (
      <a
        href="/auth/signin"
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
      >
        Sign In
      </a>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {/* User Info */}
      <div className="flex items-center gap-3">
        {session.user.image && (
          <img
            src={session.user.image}
            alt={session.user.name || 'User'}
            className="w-8 h-8 rounded-full"
          />
        )}
        <div className="hidden md:block">
          <p className="text-sm font-medium text-gray-900">
            {session.user.name || 'User'}
          </p>
          <p className="text-xs text-gray-500">{session.user.email}</p>
        </div>
      </div>

      {/* Logout Button */}
      <SignOutButton />
    </div>
  );
}
