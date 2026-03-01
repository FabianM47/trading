/**
 * Typen für das Sankey-Diagramm
 *
 * Einkommen → Ausgaben-Kategorien → Unterkategorien
 *           → Sparen-Kategorien → Unterkategorien
 */

export interface SankeyIncomeItem {
  id: string;
  name: string;
  amount: number;
}

export interface SankeyExpenseSubItem {
  id: string;
  name: string;
  amount: number;
}

export interface SankeyExpenseCategory {
  id: string;
  name: string;
  amount: number; // Gesamtbetrag der Kategorie (Summe der Unterkategorien ODER manuell)
  subItems: SankeyExpenseSubItem[];
}

/** Sparen/Investieren – gleiche Struktur wie Ausgaben */
export type SankeySavingCategory = SankeyExpenseCategory;

export interface SankeyConfig {
  id: string;
  title: string;
  incomes: SankeyIncomeItem[];
  expenses: SankeyExpenseCategory[];
  savings: SankeySavingCategory[];
  updatedAt: string;
}

/**
 * Standard-Vorlage für ein neues Sankey-Diagramm
 */
export function createDefaultSankeyConfig(): SankeyConfig {
  return {
    id: crypto.randomUUID(),
    title: 'Mein Sankey-Diagramm',
    incomes: [
      { id: crypto.randomUUID(), name: 'Gehalt', amount: 2500 },
      { id: crypto.randomUUID(), name: 'Nebeneinkünfte', amount: 300 },
    ],
    expenses: [
      {
        id: crypto.randomUUID(),
        name: 'Wohnen',
        amount: 950,
        subItems: [
          { id: crypto.randomUUID(), name: 'Miete', amount: 800 },
          { id: crypto.randomUUID(), name: 'Strom & Nebenkosten', amount: 150 },
        ],
      },
      {
        id: crypto.randomUUID(),
        name: 'Lebenshaltung',
        amount: 500,
        subItems: [
          { id: crypto.randomUUID(), name: 'Lebensmittel', amount: 350 },
          { id: crypto.randomUUID(), name: 'Drogerie & Haushalt', amount: 150 },
        ],
      },
      {
        id: crypto.randomUUID(),
        name: 'Mobilität',
        amount: 200,
        subItems: [
          { id: crypto.randomUUID(), name: 'ÖPNV / Auto', amount: 150 },
          { id: crypto.randomUUID(), name: 'Tanken', amount: 50 },
        ],
      },
      {
        id: crypto.randomUUID(),
        name: 'Versicherungen',
        amount: 250,
        subItems: [],
      },
      {
        id: crypto.randomUUID(),
        name: 'Freizeit',
        amount: 200,
        subItems: [],
      },
    ],
    savings: [
      {
        id: crypto.randomUUID(),
        name: 'Investieren',
        amount: 500,
        subItems: [
          { id: crypto.randomUUID(), name: 'ETF-Sparplan', amount: 400 },
          { id: crypto.randomUUID(), name: 'Einzelaktien', amount: 100 },
        ],
      },
      {
        id: crypto.randomUUID(),
        name: 'Rücklagen',
        amount: 200,
        subItems: [
          { id: crypto.randomUUID(), name: 'Tagesgeld', amount: 150 },
          { id: crypto.randomUUID(), name: 'Notgroschen', amount: 50 },
        ],
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}
