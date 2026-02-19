/**
 * API-basierter Storage Layer für Trades
 * 
 * Dieser Layer kommuniziert mit der Supabase-Datenbank über API Routes
 * ODER verwendet localStorage im Development (localhost).
 */

import type { Trade } from '@/types';
import { loadTrades as loadFromLocalStorage, addTrade as addToLocalStorage, updateTrade as updateInLocalStorage, deleteTrade as deleteFromLocalStorage } from './storage';

// Check ob wir im localhost sind
const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1'
);

/**
 * Lädt alle Trades des authentifizierten Benutzers von der API oder localStorage
 */
export async function loadTrades(): Promise<Trade[]> {
  // Im localhost: Verwende localStorage
  if (isLocalhost) {
    console.log('🔧 Development Mode: Using localStorage');
    return loadFromLocalStorage();
  }

  // In Production: Verwende API/Supabase
  try {
    const response = await fetch('/api/trades', {
      method: 'GET',
      credentials: 'include',
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        // Benutzer ist nicht authentifiziert
        return [];
      }
      throw new Error('Failed to load trades');
    }
    
    const data = await response.json();
    return data.trades || [];
  } catch (error) {
    console.error('Failed to load trades from API:', error);
    return [];
  }
}

/**
 * Fügt einen neuen Trade hinzu
 */
export async function addTrade(trade: Trade): Promise<Trade | null> {
  // Im localhost: Verwende localStorage
  if (isLocalhost) {
    console.log('🔧 Development Mode: Using localStorage');
    addToLocalStorage(trade);
    return trade;
  }

  // In Production: Verwende API/Supabase
  try {
    const response = await fetch('/api/trades', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(trade),
    });
    
    if (!response.ok) {
      throw new Error('Failed to add trade');
    }
    
    const data = await response.json();
    return data.trade;
  } catch (error) {
    console.error('Failed to add trade:', error);
    return null;
  }
}

/**
 * Aktualisiert einen bestehenden Trade
 */
export async function updateTrade(updatedTrade: Trade): Promise<Trade | null> {
  // Im localhost: Verwende localStorage
  if (isLocalhost) {
    console.log('🔧 Development Mode: Using localStorage');
    updateInLocalStorage(updatedTrade);
    return updatedTrade;
  }

  // In Production: Verwende API/Supabase
  try {
    const response = await fetch('/api/trades', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(updatedTrade),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update trade');
    }
    
    const data = await response.json();
    return data.trade;
  } catch (error) {
    console.error('Failed to update trade:', error);
    return null;
  }
}

/**
 * Löscht einen Trade
 */
export async function deleteTrade(tradeId: string): Promise<boolean> {
  // Im localhost: Verwende localStorage
  if (isLocalhost) {
    console.log('🔧 Development Mode: Using localStorage');
    deleteFromLocalStorage(tradeId);
    return true;
  }

  // In Production: Verwende API/Supabase
  try {
    const response = await fetch(`/api/trades?id=${tradeId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete trade');
    }
    
    return true;
  } catch (error) {
    console.error('Failed to delete trade:', error);
    return false;
  }
}

/**
 * Exportiert Trades als JSON zum Download
 */
export async function exportTrades(): Promise<string> {
  const trades = await loadTrades();
  return JSON.stringify({ trades, exportDate: new Date().toISOString() }, null, 2);
}

/**
 * Importiert Trades aus JSON
 * Fügt alle Trades einzeln hinzu
 */
export async function importTrades(jsonString: string): Promise<Trade[]> {
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

    // Alle Trades einzeln importieren
    const importedTrades: Trade[] = [];
    for (const trade of validated) {
      const imported = await addTrade(trade);
      if (imported) {
        importedTrades.push(imported);
      }
    }

    return importedTrades;
  } catch (error) {
    console.error('Failed to import trades:', error);
    throw new Error('Import fehlgeschlagen. Ungültiges JSON-Format.');
  }
}

/**
 * Löscht alle Trades (nur für Migration/Testing)
 * Achtung: Diese Funktion ist destruktiv!
 */
export async function clearAllTrades(): Promise<void> {
  const trades = await loadTrades();
  for (const trade of trades) {
    await deleteTrade(trade.id);
  }
}

/**
 * Legacy-Funktion: Keine Aktion nötig, da Trades jetzt server-seitig gespeichert werden
 */
export function saveTrades(_trades: Trade[]): void {
  // Diese Funktion ist für API-basierten Storage nicht mehr nötig
  console.warn('saveTrades() is deprecated with API-based storage');
}
