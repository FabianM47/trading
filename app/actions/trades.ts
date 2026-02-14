/**
 * Server Actions for Trades
 * 
 * Handles trade creation with validation
 */

'use server';

import { db } from '@/db';
import { instruments, positions, trades } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth/server';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const createTradeSchema = z.object({
  portfolioId: z.string().uuid(),
  instrumentId: z.string().uuid().optional(),
  isin: z.string().optional(),
  symbol: z.string().optional(),
  name: z.string().optional(),
  tradeType: z.enum(['BUY', 'SELL']),
  quantity: z.number().positive(),
  price: z.number().positive(),
  fees: z.number().nonnegative(),
  executedAt: z.date(),
  notes: z.string().optional(),
});

type CreateTradeInput = z.infer<typeof createTradeSchema>;

export async function createTrade(input: CreateTradeInput) {
  try {
    // Verify authentication
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' };
    }

    // Validate input
    const validated = createTradeSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        error: 'Ungültige Eingaben: ' + validated.error.issues.map((e) => e.message).join(', '),
      };
    }

    const data = validated.data;

    // Get or create instrument
    let instrumentId = data.instrumentId;

    if (!instrumentId && data.isin) {
      // Check if instrument exists
      const existing = await db.query.instruments.findFirst({
        where: eq(instruments.isin, data.isin),
      });

      if (existing) {
        instrumentId = existing.id;
      } else if (data.symbol && data.name) {
        // Create new instrument
        const [newInstrument] = await db
          .insert(instruments)
          .values({
            isin: data.isin,
            symbol: data.symbol,
            name: data.name,
            exchange: 'XETRA', // Default exchange
            type: 'STOCK', // Default
            currency: 'EUR', // Default
          })
          .returning();

        instrumentId = newInstrument.id;
      } else {
        return { success: false, error: 'Instrument-Daten unvollständig' };
      }
    }

    if (!instrumentId) {
      return { success: false, error: 'Kein Instrument ausgewählt' };
    }

    // 🔒 CRITICAL: Validate SELL quantity against available position
    // Prevents selling shares user doesn't own (prevents phantom profits)
    if (data.tradeType === 'SELL') {
      const existingPosition = await db.query.positions.findFirst({
        where: and(
          eq(positions.portfolioId, data.portfolioId),
          eq(positions.instrumentId, instrumentId),
          eq(positions.isClosed, false)
        ),
      });

      const availableQty = existingPosition ? parseFloat(existingPosition.totalQuantity) : 0;

      if (availableQty < data.quantity) {
        return {
          success: false,
          error: `Nicht genügend Anteile zum Verkauf. Verfügbar: ${availableQty}, Angefordert: ${data.quantity}`,
        };
      }
    }

    // Calculate total amount
    const totalAmount = data.quantity * data.price;

    // Insert trade
    await db.insert(trades).values({
      portfolioId: data.portfolioId,
      instrumentId,
      tradeType: data.tradeType,
      quantity: data.quantity.toString(),
      pricePerUnit: data.price.toString(),
      totalAmount: totalAmount.toString(),
      fees: data.fees.toString(),
      currency: 'EUR', // Default
      exchangeRate: '1.0', // Default
      notes: data.notes,
      executedAt: data.executedAt,
    });

    // Revalidate cache
    revalidatePath('/dashboard');
    revalidatePath('/dashboard-v2');

    return { success: true };
  } catch (error) {
    console.error('Create trade error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    };
  }
}
