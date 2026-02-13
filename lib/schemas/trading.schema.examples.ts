/**
 * Beispiele für die Verwendung der Zod Schemas
 * 
 * Diese Datei zeigt Best Practices für Validation, Normalisierung und Type Safety
 */

import {
  calculateTotalAmount,
  createTradeRequestSchema,
  formatZodError,
  getDateRangeFromPreset,
  groupAssignRequestSchema,
  instrumentSearchRequestSchema,
  positionFilterSchema,
  tradeFilterSchema,
  validateData
} from '@/lib/schemas/trading.schema';

import type {
  ApiResponse,
  CreateTradeRequest,
  InstrumentSearchRequest,
  TradeFilter,
} from '@/lib/types/trading.types';

// ============================================================================
// Beispiel 1: Trade erstellen mit Validation
// ============================================================================

async function createTradeExample() {
  const rawInput = {
    portfolioId: '123e4567-e89b-12d3-a456-426614174000',
    isin: 'us0378331005', // lowercase -> wird zu UPPERCASE normalisiert
    tradeType: 'BUY',
    quantity: '10.5',
    pricePerUnit: '125.50',
    fees: '5.00',
    currency: 'eur', // lowercase -> wird zu EUR normalisiert
    executedAt: '2026-02-13T10:30:00Z',
    notes: 'Initial position in Apple Inc.',
  };

  // Validieren und normalisieren
  const result = validateData(createTradeRequestSchema, rawInput);

  if (!result.success) {
    console.error('Validation failed:', formatZodError(result.error));
    return;
  }

  // result.data ist jetzt typsicher und normalisiert
  const trade: CreateTradeRequest = result.data;

  console.log('Normalized ISIN:', trade.isin); // "US0378331005"
  console.log('Normalized Currency:', trade.currency); // "EUR"

  // Berechne totalAmount wenn nicht angegeben
  const totalAmount = calculateTotalAmount(
    trade.quantity,
    trade.pricePerUnit,
    trade.fees
  );

  console.log('Total Amount:', totalAmount); // "1323.25" (10.5 * 125.50 + 5.00)

  // Jetzt zur Datenbank hinzufügen
  // await db.insert(trades).values({ ...trade, totalAmount });
}

// ============================================================================
// Beispiel 2: Instrument suchen mit flexiblen Filtern
// ============================================================================

async function searchInstrumentsExample() {
  // Suche nach ISIN
  const byIsin = validateData(instrumentSearchRequestSchema, {
    isin: 'us0378331005',
  });

  // Suche nach Symbol
  const bySymbol = validateData(instrumentSearchRequestSchema, {
    symbol: 'aapl', // wird zu "AAPL"
    exchange: 'NASDAQ',
  });

  // Suche nach Text
  const byText = validateData(instrumentSearchRequestSchema, {
    query: 'Apple',
    type: 'STOCK',
    currency: 'USD',
    limit: 20,
  });

  // Kombinierte Suche
  const combined = validateData(instrumentSearchRequestSchema, {
    query: 'technology',
    sector: 'Technology',
    country: 'us', // wird zu "US"
    isActive: true,
    limit: 50,
  });

  if (byIsin.success) {
    const request: InstrumentSearchRequest = byIsin.data;
    console.log('Search by ISIN:', request);
    // await db.select().from(instruments).where(eq(instruments.isin, request.isin));
  }
}

// ============================================================================
// Beispiel 3: Trades filtern mit Date Range Presets
// ============================================================================

async function filterTradesExample() {
  // Filter mit Preset
  const lastMonth = getDateRangeFromPreset('LAST_MONTH');

  const filter = validateData(tradeFilterSchema, {
    portfolioId: '123e4567-e89b-12d3-a456-426614174000',
    tradeType: 'BUY',
    dateFrom: lastMonth?.dateFrom,
    dateTo: lastMonth?.dateTo,
    minAmount: '100',
    sortBy: 'executedAt',
    sortOrder: 'desc',
    limit: 50,
  });

  if (filter.success) {
    const params: TradeFilter = filter.data;
    console.log('Filter:', params);

    // await db
    //   .select()
    //   .from(trades)
    //   .where(
    //     and(
    //       eq(trades.portfolioId, params.portfolioId),
    //       params.tradeType ? eq(trades.tradeType, params.tradeType) : undefined,
    //       params.dateFrom ? gte(trades.executedAt, params.dateFrom) : undefined,
    //       params.dateTo ? lte(trades.executedAt, params.dateTo) : undefined
    //     )
    //   )
    //   .orderBy(desc(trades.executedAt))
    //   .limit(params.limit)
    //   .offset(params.offset);
  }
}

// ============================================================================
// Beispiel 4: Position Filter mit Status und Profit-Filter
// ============================================================================

async function filterPositionsExample() {
  const filter = validateData(positionFilterSchema, {
    portfolioId: '123e4567-e89b-12d3-a456-426614174000',
    status: 'OPEN', // Nur offene Positionen
    profitOnly: true, // Nur profitable Positionen
    currency: 'EUR',
    sortBy: 'totalInvested',
    sortOrder: 'desc',
  });

  if (filter.success) {
    console.log('Position Filter:', filter.data);

    // await db
    //   .select()
    //   .from(positions)
    //   .where(
    //     and(
    //       eq(positions.portfolioId, filter.data.portfolioId),
    //       eq(positions.isClosed, false),
    //       // profitOnly würde im Service Layer geprüft (mit currentPrice)
    //       filter.data.currency ? eq(positions.currency, filter.data.currency) : undefined
    //     )
    //   )
    //   .orderBy(desc(positions.totalInvested));
  }
}

// ============================================================================
// Beispiel 5: API Route mit Error Handling
// ============================================================================

async function apiRouteExample(request: Request): Promise<Response> {
  try {
    const body = await request.json();

    // Validiere Input
    const result = validateData(createTradeRequestSchema, body);

    if (!result.success) {
      const apiError: ApiResponse<never> = {
        success: false,
        error: 'Validation failed',
        details: formatZodError(result.error),
      };

      return Response.json(apiError, { status: 400 });
    }

    // Verarbeite validierten Input
    const trade = result.data;

    // ... Business Logic ...

    const apiSuccess: ApiResponse<CreateTradeRequest> = {
      success: true,
      data: trade,
      message: 'Trade created successfully',
    };

    return Response.json(apiSuccess, { status: 201 });
  } catch (error) {
    const apiError: ApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return Response.json(apiError, { status: 500 });
  }
}

// ============================================================================
// Beispiel 6: Server Action mit Type Safety
// ============================================================================

async function createTradeAction(formData: FormData) {
  'use server';

  const rawData = {
    portfolioId: formData.get('portfolioId')?.toString(),
    isin: formData.get('isin')?.toString(),
    tradeType: formData.get('tradeType')?.toString(),
    quantity: formData.get('quantity')?.toString(),
    pricePerUnit: formData.get('pricePerUnit')?.toString(),
    fees: formData.get('fees')?.toString() || '0',
    currency: formData.get('currency')?.toString(),
    executedAt: formData.get('executedAt')?.toString(),
    notes: formData.get('notes')?.toString(),
  };

  const result = validateData(createTradeRequestSchema, rawData);

  if (!result.success) {
    return {
      success: false,
      error: 'Validation failed',
      details: formatZodError(result.error),
    };
  }

  // result.data ist typsicher
  const trade = result.data;

  try {
    // await db.insert(trades).values(trade);

    return {
      success: true,
      message: 'Trade created successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Beispiel 7: React Hook Form Integration
// ============================================================================

/*
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTradeRequestSchema } from '@/lib/schemas/trading.schema';
import type { CreateTradeRequest } from '@/lib/types/trading.types';

function TradeFormComponent() {
  const form = useForm<CreateTradeRequest>({
    resolver: zodResolver(createTradeRequestSchema),
    defaultValues: {
      tradeType: 'BUY',
      fees: '0',
      currency: 'EUR',
      exchangeRate: '1.0',
    },
  });

  const onSubmit = async (data: CreateTradeRequest) => {
    // data ist bereits validiert und normalisiert
    console.log('Normalized Trade:', data);
    
    // API Call
    const response = await fetch('/api/trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    console.log('API Response:', result);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register('isin')} placeholder="ISIN (z.B. US0378331005)" />
      {form.formState.errors.isin && (
        <span>{form.formState.errors.isin.message}</span>
      )}
      
      <input {...form.register('quantity')} placeholder="Anzahl (z.B. 10.5)" />
      <input {...form.register('pricePerUnit')} placeholder="Preis (z.B. 125.50)" />
      
      <button type="submit">Trade erstellen</button>
    </form>
  );
}
*/

// ============================================================================
// Beispiel 8: Batch Operations mit Validation
// ============================================================================

async function batchGroupAssignExample() {
  const rawData = {
    instrumentIds: [
      '123e4567-e89b-12d3-a456-426614174001',
      '123e4567-e89b-12d3-a456-426614174002',
      '123e4567-e89b-12d3-a456-426614174003',
    ],
    groupId: '123e4567-e89b-12d3-a456-426614174100',
    action: 'ADD',
  };

  const result = validateData(groupAssignRequestSchema, rawData);

  if (result.success) {
    console.log('Batch assign:', result.data);

    // Batch insert
    // const assignments = result.data.instrumentIds.map(instrumentId => ({
    //   instrumentId,
    //   groupId: result.data.groupId,
    // }));
    // 
    // await db.insert(instrumentGroupAssignments).values(assignments);
  }
}

// ============================================================================
// Export examples
// ============================================================================

export {
  apiRouteExample, batchGroupAssignExample, createTradeAction, createTradeExample, filterPositionsExample, filterTradesExample, searchInstrumentsExample
};

