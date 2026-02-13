/**
 * Server Actions für Trading
 * 
 * Server Actions sollten nur für Formular-Submissions und Mutations verwendet werden.
 * Für GET Requests nutze Route Handlers in app/api/
 */

'use server';

import {
  createTradeRequestSchema,
  formatZodError,
  type CreateTradeRequest
} from '@/lib/schemas/trading.schema';
import { revalidatePath } from 'next/cache';

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: Record<string, string[]> };

/**
 * Erstellt einen neuen Trade
 */
export async function createTradeAction(
  data: unknown
): Promise<ActionResult<CreateTradeRequest>> {
  // 1. Validierung mit Zod
  const result = createTradeRequestSchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      error: formatZodError(result.error),
    };
  }

  try {
    // 2. Business Logic
    const trade = result.data;

    // Hier würdest du in die Datenbank schreiben
    // await db.insert(trades).values(trade);

    console.log('Trade created:', trade);

    // 3. Cache invalidieren
    revalidatePath('/dashboard/trades');
    revalidatePath('/dashboard');

    return {
      success: true,
      data: trade,
    };
  } catch (error) {
    console.error('Failed to create trade:', error);
    return {
      success: false,
      error: {
        _form: ['Ein Fehler ist aufgetreten. Bitte versuche es erneut.'],
      },
    };
  }
}

/**
 * Aktualisiert einen bestehenden Trade (nur Notes und ExecutedAt)
 */
export async function updateTradeAction(
  id: string,
  data: unknown
): Promise<ActionResult<CreateTradeRequest>> {
  const result = createTradeRequestSchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      error: formatZodError(result.error),
    };
  }

  try {
    // Update in DB
    // await db.update(trades).set(result.data).where(eq(trades.id, id));

    revalidatePath('/dashboard/trades');

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    console.error('Failed to update trade:', error);
    return {
      success: false,
      error: {
        _form: ['Update fehlgeschlagen.'],
      },
    };
  }
}

/**
 * Löscht einen Trade (Soft Delete)
 */
export async function deleteTradeAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    // Soft Delete (oder Hard Delete je nach Anforderung)
    // await db.delete(trades).where(eq(trades.id, id));

    revalidatePath('/dashboard/trades');

    return {
      success: true,
      data: { id },
    };
  } catch (error) {
    console.error('Failed to delete trade:', error);
    return {
      success: false,
      error: {
        _form: ['Löschen fehlgeschlagen.'],
      },
    };
  }
}
