/**
 * Groups Management Page
 * 
 * Features:
 * - List all groups
 * - Create new group with color picker
 * - Edit/Delete groups
 * - Assign instruments to groups
 */

import { db } from '@/db';
import { groups as groupsTable } from '@/db/schema';
import { requireAuth } from '@/lib/auth/server';
import { eq } from 'drizzle-orm';
import { GroupsClient } from './groups-client';

export const metadata = {
  title: 'Gruppen | Trading Portfolio',
  description: 'Verwalte deine Instrument-Gruppen',
};

export default async function GroupsPage() {
  // Require authentication
  const user = await requireAuth();

  if (!user.id) {
    throw new Error('User ID is required');
  }

  // Fetch user's groups
  const groups = await db
    .select()
    .from(groupsTable)
    .where(eq(groupsTable.userId, user.id))
    .orderBy(groupsTable.name);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Gruppen
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Organisiere deine Instrumente in Gruppen
        </p>
      </div>

      <GroupsClient initialGroups={groups} />
    </div>
  );
}
