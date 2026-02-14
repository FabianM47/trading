/**
 * Server Actions for Groups
 * 
 * Handles group CRUD operations
 */

'use server';

import { db } from '@/db';
import { instrumentGroups, portfolios } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth/server';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-F]{6}$/i),
});

const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
});

export async function createGroup(input: { name: string; color: string }) {
  try {
    // Verify authentication
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, error: 'Nicht authentifiziert' };
    }

    // Validate input
    const validated = createGroupSchema.safeParse(input);
    if (!validated.success) {
      return { success: false, error: 'Ungültige Eingaben' };
    }

    const data = validated.data;

    // Get or create default portfolio for user
    let [portfolio] = await db
      .select()
      .from(portfolios)
      .where(eq(portfolios.userId, user.id))
      .limit(1);

    if (!portfolio) {
      // Create default portfolio
      [portfolio] = await db
        .insert(portfolios)
        .values({
          userId: user.id,
          name: 'Standard Portfolio',
          isDefault: true,
        })
        .returning();
    }

    // Insert group
    const [newGroup] = await db
      .insert(instrumentGroups)
      .values({
        portfolioId: portfolio.id,
        name: data.name,
        color: data.color,
      })
      .returning();

    // Revalidate cache
    revalidatePath('/groups');
    revalidatePath('/dashboard-v2');

    return { success: true, group: newGroup };
  } catch (error) {
    console.error('Create group error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    };
  }
}

export async function updateGroup(
  id: string,
  input: { name?: string; color?: string }
) {
  try {
    // Verify authentication
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, error: 'Nicht authentifiziert' };
    }

    // Validate input
    const validated = updateGroupSchema.safeParse(input);
    if (!validated.success) {
      return { success: false, error: 'Ungültige Eingaben' };
    }

    const data = validated.data;

    // Update group
    await db
      .update(instrumentGroups)
      .set(data)
      .where(eq(instrumentGroups.id, id));

    // Revalidate cache
    revalidatePath('/groups');
    revalidatePath('/dashboard-v2');

    return { success: true };
  } catch (error) {
    console.error('Update group error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    };
  }
}

export async function deleteGroup(id: string) {
  try {
    // Verify authentication
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, error: 'Nicht authentifiziert' };
    }

    // Delete group
    await db.delete(instrumentGroups).where(eq(instrumentGroups.id, id));

    // Revalidate cache
    revalidatePath('/groups');
    revalidatePath('/dashboard-v2');

    return { success: true };
  } catch (error) {
    console.error('Delete group error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    };
  }
}
