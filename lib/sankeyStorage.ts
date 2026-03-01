/**
 * Storage-Layer für Sankey-Diagramm Daten
 * 
 * Gleiche Architektur wie apiStorage.ts:
 * - localStorage im Development (localhost)
 * - API/Supabase in Production
 */

import type { SankeyConfig } from '@/types/sankey';
import { createDefaultSankeyConfig } from '@/types/sankey';

const STORAGE_KEY = 'trading-sankey-config';

const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
);

// ── localStorage Helpers ──────────────────────────────────────────

function loadFromLocalStorage(): SankeyConfig {
  if (typeof window === 'undefined') return createDefaultSankeyConfig();

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return createDefaultSankeyConfig();
    const parsed = JSON.parse(stored) as SankeyConfig;
    // Backward-Compat: savings sicherstellen
    if (!parsed.savings) parsed.savings = [];
    return parsed;
  } catch {
    return createDefaultSankeyConfig();
  }
}

function saveToLocalStorage(config: SankeyConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save sankey config to localStorage:', error);
  }
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Lädt die Sankey-Konfiguration des Benutzers
 */
export async function loadSankeyConfig(): Promise<SankeyConfig> {
  if (isLocalhost) {
    return loadFromLocalStorage();
  }

  try {
    const response = await fetch('/api/sankey', {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Noch keine Config gespeichert → Default zurückgeben
        return createDefaultSankeyConfig();
      }
      throw new Error('Failed to load sankey config');
    }

    const data = await response.json();
    const loaded = data.config as SankeyConfig;
    // Backward-Compat: savings sicherstellen
    if (!loaded.savings) loaded.savings = [];
    return loaded;
  } catch (error) {
    console.error('Failed to load sankey config from API:', error);
    return createDefaultSankeyConfig();
  }
}

/**
 * Speichert die Sankey-Konfiguration
 */
export async function saveSankeyConfig(config: SankeyConfig): Promise<boolean> {
  config.updatedAt = new Date().toISOString();

  if (isLocalhost) {
    saveToLocalStorage(config);
    return true;
  }

  try {
    const response = await fetch('/api/sankey', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error('Failed to save sankey config');
    }

    return true;
  } catch (error) {
    console.error('Failed to save sankey config:', error);
    return false;
  }
}
