/**
 * Sign Out Button (Client Component)
 * 
 * Must be a Client Component to use signOut from next-auth/react
 */

'use client';

import { signOut } from 'next-auth/react';

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/' })}
      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
    >
      Sign Out
    </button>
  );
}
