/**
 * Zod Schemas für Trading Daten
 * 
 * Alle Input-Validierungen sollten durch Zod Schemas erfolgen.
 * Types werden automatisch aus den Schemas inferiert.
 */

import { z } from 'zod';

// ============================================================================
// Trade Order Schemas
// ============================================================================

export const tradeOrderSchema = z.object({
  symbol: z
    .string()
    .min(1, 'Symbol ist erforderlich')
    .max(10, 'Symbol darf maximal 10 Zeichen lang sein')
    .regex(/^[A-Z0-9/]+$/, 'Symbol muss Großbuchstaben und Zahlen enthalten'),

  amount: z
    .number()
    .positive('Menge muss positiv sein')
    .finite('Menge muss eine gültige Zahl sein'),

  type: z.enum(['buy', 'sell'], {
    message: 'Type muss "buy" oder "sell" sein',
  }),

  price: z
    .number()
    .positive('Preis muss positiv sein')
    .optional(),

  stopLoss: z
    .number()
    .positive('Stop Loss muss positiv sein')
    .optional(),

  takeProfit: z
    .number()
    .positive('Take Profit muss positiv sein')
    .optional(),
});

export type TradeOrder = z.infer<typeof tradeOrderSchema>;

// ============================================================================
// Trade Filter Schemas
// ============================================================================

export const tradeFilterSchema = z.object({
  symbol: z.string().optional(),
  type: z.enum(['buy', 'sell']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  minAmount: z.number().positive().optional(),
  maxAmount: z.number().positive().optional(),
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
});

export type TradeFilter = z.infer<typeof tradeFilterSchema>;

// ============================================================================
// User Profile Schemas
// ============================================================================

export const userProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name muss mindestens 2 Zeichen lang sein')
    .max(50, 'Name darf maximal 50 Zeichen lang sein'),

  email: z
    .string()
    .email('Ungültige E-Mail-Adresse'),

  riskTolerance: z.enum(['low', 'medium', 'high'], {
    message: 'Risikotoleranz muss low, medium oder high sein',
  }),

  maxTradeAmount: z
    .number()
    .positive('Maximaler Trade-Betrag muss positiv sein')
    .optional(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

// ============================================================================
// Alert Schemas
// ============================================================================

export const priceAlertSchema = z.object({
  symbol: z.string().min(1, 'Symbol ist erforderlich'),

  targetPrice: z.number().positive('Zielpreis muss positiv sein'),

  condition: z.enum(['above', 'below'], {
    message: 'Bedingung muss "above" oder "below" sein',
  }),

  notificationType: z.enum(['email', 'push', 'both'], {
    message: 'Ungültiger Benachrichtigungstyp',
  }),

  enabled: z.boolean().default(true),
});

export type PriceAlert = z.infer<typeof priceAlertSchema>;

// ============================================================================
// API Response Schemas
// ============================================================================

export const apiErrorSchema = z.object({
  error: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string().datetime(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export const apiSuccessSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  message: z.string().optional(),
  timestamp: z.string().datetime(),
});

export type ApiSuccess = z.infer<typeof apiSuccessSchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validiert Daten mit einem Zod Schema und gibt typsichere Ergebnisse zurück
 */
export function validateData<T extends z.ZodType>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}

/**
 * Formatiert Zod Validierungs-Fehler für API Responses
 */
export function formatZodError(error: z.ZodError): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}
