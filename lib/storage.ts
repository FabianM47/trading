import type { Trade, StorageData } from '@/types';

const STORAGE_KEY = 'trading-portfolio-data';
const CURRENT_VERSION = 3;

/**
 * Speichert Trades in localStorage
 */
export function saveTrades(trades: Trade[]): void {
  if (typeof window === 'undefined') return;

  const data: StorageData = {
    version: CURRENT_VERSION,
    trades,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save trades to localStorage:', error);
  }
}

/**
 * Lädt Trades aus localStorage mit Versionierung und Migration
 */
export function loadTrades(): Trade[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const data = JSON.parse(stored) as StorageData;

    // Migration falls nötig
    const migrated = migrateData(data);

    return migrated.trades;
  } catch (error) {
    console.error('Failed to load trades from localStorage:', error);
    return [];
  }
}

/**
 * Migriert Daten von älteren Versionen
 */
function migrateData(data: StorageData): StorageData {
  let migrated = { ...data };

  // Migration von Version 0 auf Version 1
  if (!migrated.version || migrated.version < 1) {
    migrated = {
      version: 1,
      trades: migrated.trades || [],
    };
  }

  // Migration von Version 1 auf Version 2: isClosed hinzufügen
  if (migrated.version < 2) {
    migrated = {
      version: 2,
      trades: migrated.trades.map(trade => ({
        ...trade,
        isClosed: false,
      })),
    };
  }

  // Migration von Version 2 auf Version 3: currentPrice hinzufügen
  if (migrated.version < 3) {
    migrated = {
      version: 3,
      trades: migrated.trades.map(trade => ({
        ...trade,
        // currentPrice wird initial auf undefined gesetzt und beim ersten Refresh gefüllt
      })),
    };
  }

  return migrated;
}

/**
 * Fügt einen neuen Trade hinzu
 */
export function addTrade(trade: Trade): Trade[] {
  const trades = loadTrades();
  const updated = [...trades, trade];
  saveTrades(updated);
  return updated;
}

/**
 * Aktualisiert einen bestehenden Trade
 */
export function updateTrade(updatedTrade: Trade): Trade[] {
  const trades = loadTrades();
  const updated = trades.map((t) =>
    t.id === updatedTrade.id ? updatedTrade : t
  );
  saveTrades(updated);
  return updated;
}

/**
 * Löscht einen Trade
 */
export function deleteTrade(tradeId: string): Trade[] {
  const trades = loadTrades();
  const updated = trades.filter((t) => t.id !== tradeId);
  saveTrades(updated);
  return updated;
}

/**
 * Löscht alle Trades (Reset)
 */
export function clearAllTrades(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Exportiert Trades als JSON zum Download
 */
export function exportTrades(): string {
  const trades = loadTrades();
  return JSON.stringify({ trades, exportDate: new Date().toISOString() }, null, 2);
}

/**
 * Importiert Trades aus JSON
 */
export function importTrades(jsonString: string): Trade[] {
  try {
    const parsed = JSON.parse(jsonString);
    const trades = parsed.trades || parsed;
    
    // Validierung
    if (!Array.isArray(trades)) {
      throw new Error('Invalid format: expected array of trades');
    }

    // Basis-Validierung jedes Trades
    const validated = trades.filter((t: Trade) => {
      return (
        t.id &&
        t.isin &&
        t.name &&
        typeof t.buyPrice === 'number' &&
        typeof t.quantity === 'number' &&
        typeof t.investedEur === 'number' &&
        t.buyDate
      );
    });

    saveTrades(validated);
    return validated;
  } catch (error) {
    console.error('Failed to import trades:', error);
    throw new Error('Import fehlgeschlagen. Ungültiges JSON-Format.');
  }
}
