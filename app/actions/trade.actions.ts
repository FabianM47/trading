/**
 * Server Actions für Trading
 * 
 * Server Actions sollten nur für Formular-Submissions und Mutations verwendet werden.
 * Für GET Requests nutze Route Handlers in app/api/
 */

'use server';

import { formatZodError, tradeOrderSchema, type TradeOrder } from '@/lib/schemas/trading.schema';
import { revalidatePath } from 'next/cache';

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: Record<string, string[]> };

/**
 * Erstellt einen neuen Trade Order
 */
export async function createTradeOrder(
  data: unknown
): Promise<ActionResult<TradeOrder>> {
  // 1. Validierung mit Zod
  const result = tradeOrderSchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      error: formatZodError(result.error),
    };
  }

  try {
    // 2. Business Logic
    const order = result.data;

    // Hier würdest du in die Datenbank schreiben
    // await db.trades.create(order);

    console.log('Trade Order created:', order);

    // 3. Cache invalidieren
    revalidatePath('/dashboard/trades');
    revalidatePath('/dashboard');

    return {
      success: true,
      data: order,
    };
  } catch (error) {
    console.error('Failed to create trade order:', error);
    return {
      success: false,
      error: {
        _form: ['Ein Fehler ist aufgetreten. Bitte versuche es erneut.'],
      },
    };
  }
}

/**
 * Aktualisiert einen bestehenden Trade Order
 */
export async function updateTradeOrder(
  id: string,
  data: unknown
): Promise<ActionResult<TradeOrder>> {
  const result = tradeOrderSchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      error: formatZodError(result.error),
    };
  }

  try {
    // Update in DB
    // await db.trades.update(id, result.data);

    revalidatePath('/dashboard/trades');

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    console.error('Failed to update trade order:', error);
    return {
      success: false,
      error: {
        _form: ['Update fehlgeschlagen.'],
      },
    };
  }
}

/**
 * Löscht einen Trade Order
 */
export async function deleteTradeOrder(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    // Delete from DB
    // await db.trades.delete(id);

    revalidatePath('/dashboard/trades');

    return {
      success: true,
      data: { id },
    };
  } catch (error) {
    console.error('Failed to delete trade order:', error);
    return {
      success: false,
      error: {
        _form: ['Löschen fehlgeschlagen.'],
      },
    };
  }
}
