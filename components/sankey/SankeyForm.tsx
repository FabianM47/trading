'use client';

import { useCallback, useState, useMemo } from 'react';
import { Wallet, CreditCard, TrendingUp, Plus, Trash2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import type { SankeyConfig, SankeyIncomeItem, SankeyExpenseCategory, SankeyExpenseSubItem, SankeySavingCategory } from '@/types/sankey';

interface SankeyFormProps {
  config: SankeyConfig;
  onChange: (config: SankeyConfig) => void;
}

// ── Helpers ───────────────────────────────────────────────────────

function newId(): string {
  return crypto.randomUUID();
}

// ── Component ─────────────────────────────────────────────────────

export default function SankeyForm({ config, onChange }: SankeyFormProps) {
  // ── Income Handlers ─────────────────────────────────────────────

  const updateIncome = useCallback(
    (id: string, field: keyof SankeyIncomeItem, value: string | number) => {
      const incomes = config.incomes.map((inc) =>
        inc.id === id ? { ...inc, [field]: value } : inc
      );
      onChange({ ...config, incomes });
    },
    [config, onChange]
  );

  const addIncome = useCallback(() => {
    onChange({
      ...config,
      incomes: [...config.incomes, { id: newId(), name: '', amount: 0 }],
    });
  }, [config, onChange]);

  const removeIncome = useCallback(
    (id: string) => {
      onChange({ ...config, incomes: config.incomes.filter((i) => i.id !== id) });
    },
    [config, onChange]
  );

  // ── Expense Category Handlers ───────────────────────────────────

  const updateCategory = useCallback(
    (id: string, field: keyof SankeyExpenseCategory, value: string | number) => {
      const expenses = config.expenses.map((cat) =>
        cat.id === id ? { ...cat, [field]: value } : cat
      );
      onChange({ ...config, expenses });
    },
    [config, onChange]
  );

  const addCategory = useCallback(() => {
    const newCat: SankeyExpenseCategory = {
      id: newId(),
      name: '',
      amount: 0,
      subItems: [],
    };
    onChange({ ...config, expenses: [...config.expenses, newCat] });
  }, [config, onChange]);

  const removeCategory = useCallback(
    (id: string) => {
      onChange({ ...config, expenses: config.expenses.filter((c) => c.id !== id) });
    },
    [config, onChange]
  );

  // ── Sub-Item Handlers ───────────────────────────────────────────

  const updateSubItem = useCallback(
    (catId: string, subId: string, field: keyof SankeyExpenseSubItem, value: string | number) => {
      const expenses = config.expenses.map((cat) => {
        if (cat.id !== catId) return cat;
        const subItems = cat.subItems.map((sub) =>
          sub.id === subId ? { ...sub, [field]: value } : sub
        );
        return { ...cat, subItems };
      });
      onChange({ ...config, expenses });
    },
    [config, onChange]
  );

  const addSubItem = useCallback(
    (catId: string) => {
      const expenses = config.expenses.map((cat) => {
        if (cat.id !== catId) return cat;
        return {
          ...cat,
          subItems: [...cat.subItems, { id: newId(), name: '', amount: 0 }],
        };
      });
      onChange({ ...config, expenses });
    },
    [config, onChange]
  );

  const removeSubItem = useCallback(
    (catId: string, subId: string) => {
      const expenses = config.expenses.map((cat) => {
        if (cat.id !== catId) return cat;
        return { ...cat, subItems: cat.subItems.filter((s) => s.id !== subId) };
      });
      onChange({ ...config, expenses });
    },
    [config, onChange]
  );

  // ── Savings Category Handlers ───────────────────────────────────

  const updateSaving = useCallback(
    (id: string, field: keyof SankeySavingCategory, value: string | number) => {
      const savings = (config.savings || []).map((sav) =>
        sav.id === id ? { ...sav, [field]: value } : sav
      );
      onChange({ ...config, savings });
    },
    [config, onChange]
  );

  const addSaving = useCallback(() => {
    const newSav: SankeySavingCategory = {
      id: newId(),
      name: '',
      amount: 0,
      subItems: [],
    };
    onChange({ ...config, savings: [...(config.savings || []), newSav] });
  }, [config, onChange]);

  const removeSaving = useCallback(
    (id: string) => {
      onChange({ ...config, savings: (config.savings || []).filter((s) => s.id !== id) });
    },
    [config, onChange]
  );

  // ── Savings Sub-Item Handlers ───────────────────────────────────

  const updateSavingSubItem = useCallback(
    (savId: string, subId: string, field: keyof SankeyExpenseSubItem, value: string | number) => {
      const savings = (config.savings || []).map((sav) => {
        if (sav.id !== savId) return sav;
        const subItems = sav.subItems.map((sub) =>
          sub.id === subId ? { ...sub, [field]: value } : sub
        );
        return { ...sav, subItems };
      });
      onChange({ ...config, savings });
    },
    [config, onChange]
  );

  const addSavingSubItem = useCallback(
    (savId: string) => {
      const savings = (config.savings || []).map((sav) => {
        if (sav.id !== savId) return sav;
        return {
          ...sav,
          subItems: [...sav.subItems, { id: newId(), name: '', amount: 0 }],
        };
      });
      onChange({ ...config, savings });
    },
    [config, onChange]
  );

  const removeSavingSubItem = useCallback(
    (savId: string, subId: string) => {
      const savings = (config.savings || []).map((sav) => {
        if (sav.id !== savId) return sav;
        return { ...sav, subItems: sav.subItems.filter((s) => s.id !== subId) };
      });
      onChange({ ...config, savings });
    },
    [config, onChange]
  );

  // ── Computed Values ──────────────────────────────────────────────

  const totals = useMemo(() => {
    const income = config.incomes.reduce((s, i) => s + Math.max(i.amount, 0), 0);
    const expenses = config.expenses.reduce((s, c) => s + Math.max(c.amount, 0), 0);
    const savings = (config.savings || []).reduce((s, c) => s + Math.max(c.amount, 0), 0);
    return { income, expenses, savings, remaining: income - expenses - savings };
  }, [config]);

  // ── Collapsible Section State ───────────────────────────────────

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    income: true,
    expenses: true,
    savings: true,
  });

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ── Einkommen ────────────────────────────────────── */}
      <section className="bg-background-card rounded-card border border-border shadow-card overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('income')}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-background-elevated/30 transition-colors"
          aria-expanded={expandedSections.income}
        >
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-profit" />
            <h3 className="text-lg font-semibold text-profit">Einkommen</h3>
            <span className="text-xs text-text-tertiary tabular-nums ml-1">
              ({config.incomes.length})
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-profit tabular-nums">{formatCurrencyCompact(totals.income)}</span>
            {expandedSections.income ? (
              <ChevronUp className="w-4 h-4 text-text-tertiary" />
            ) : (
              <ChevronDown className="w-4 h-4 text-text-tertiary" />
            )}
          </div>
        </button>

        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedSections.income ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-5 pb-5 space-y-3">
            {config.incomes.map((income) => (
              <div key={income.id} className="group relative flex items-center gap-2 bg-background-elevated border border-border rounded-xl px-3 py-2.5 transition-all hover:border-profit/30 hover:shadow-sm">
                <div className="w-1.5 h-8 rounded-full bg-profit/30 flex-shrink-0" />
                <input
                  type="text"
                  value={income.name}
                  onChange={(e) => updateIncome(income.id, 'name', e.target.value)}
                  placeholder="z.B. Gehalt"
                  className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none min-w-0"
                  aria-label="Einkommensname"
                />
                <div className="relative flex-shrink-0">
                  <input
                    type="number"
                    value={income.amount || ''}
                    onChange={(e) => updateIncome(income.id, 'amount', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                    step="50"
                    className="w-24 pr-5 bg-transparent text-sm text-right font-semibold text-text-primary tabular-nums placeholder:text-text-tertiary outline-none"
                    aria-label="Betrag"
                  />
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 text-text-tertiary text-xs pointer-events-none">€</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeIncome(income.id)}
                  className="flex-shrink-0 ml-1 p-1.5 text-text-tertiary sm:text-text-tertiary/0 sm:group-hover:text-text-tertiary hover:!text-loss transition-all rounded-lg hover:bg-loss/10"
                  title="Entfernen"
                  aria-label={`${income.name || 'Einkommen'} entfernen`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addIncome}
              className="w-full text-xs bg-profit/10 text-profit px-3 py-2.5 rounded-xl hover:bg-profit/20 transition-colors font-medium flex items-center justify-center gap-1.5 border border-profit/20 border-dashed"
              aria-label="Einkommen hinzufügen"
            >
              <Plus className="w-3.5 h-3.5" />
              Einkommen hinzufügen
            </button>
          </div>
        </div>
      </section>

      {/* ── Ausgaben ─────────────────────────────────────── */}
      <section className="bg-background-card rounded-card border border-border shadow-card overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('expenses')}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-background-elevated/30 transition-colors"
          aria-expanded={expandedSections.expenses}
        >
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-loss" />
            <h3 className="text-lg font-semibold text-loss">Ausgaben</h3>
            <span className="text-xs text-text-tertiary tabular-nums ml-1">
              ({config.expenses.length})
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-loss tabular-nums">{formatCurrencyCompact(totals.expenses)}</span>
            {expandedSections.expenses ? (
              <ChevronUp className="w-4 h-4 text-text-tertiary" />
            ) : (
              <ChevronDown className="w-4 h-4 text-text-tertiary" />
            )}
          </div>
        </button>

        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedSections.expenses ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-5 pb-5 space-y-4">
            {config.expenses.map((cat, catIdx) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                colorIndex={catIdx}
                colors={['#a855f7', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#6366f1', '#84cc16', '#e879f9', '#fb7185', '#38bdf8', '#facc15', '#4ade80', '#c084fc', '#f472b6', '#22d3ee', '#a3e635', '#fbbf24']}
                onUpdateCategory={(field, value) => updateCategory(cat.id, field, value)}
                onRemoveCategory={() => removeCategory(cat.id)}
                onUpdateSubItem={(subId, field, value) => updateSubItem(cat.id, subId, field, value)}
                onAddSubItem={() => addSubItem(cat.id)}
                onRemoveSubItem={(subId) => removeSubItem(cat.id, subId)}
              />
            ))}
            <button
              type="button"
              onClick={addCategory}
              className="w-full text-xs bg-loss/10 text-loss px-3 py-2.5 rounded-xl hover:bg-loss/20 transition-colors font-medium flex items-center justify-center gap-1.5 border border-loss/20 border-dashed"
              aria-label="Ausgaben-Kategorie hinzufügen"
            >
              <Plus className="w-3.5 h-3.5" />
              Kategorie hinzufügen
            </button>
          </div>
        </div>
      </section>

      {/* ── Sparen & Investieren ─────────────────────────── */}
      <section className="bg-background-card rounded-card border border-border shadow-card overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('savings')}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-background-elevated/30 transition-colors"
          aria-expanded={expandedSections.savings}
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" style={{ color: '#10b981' }} />
            <h3 className="text-lg font-semibold" style={{ color: '#10b981' }}>Sparen & Investieren</h3>
            <span className="text-xs text-text-tertiary tabular-nums ml-1">
              ({(config.savings || []).length})
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold tabular-nums" style={{ color: '#10b981' }}>{formatCurrencyCompact(totals.savings)}</span>
            {expandedSections.savings ? (
              <ChevronUp className="w-4 h-4 text-text-tertiary" />
            ) : (
              <ChevronDown className="w-4 h-4 text-text-tertiary" />
            )}
          </div>
        </button>

        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedSections.savings ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-5 pb-5 space-y-4">
            {(config.savings || []).map((sav, savIdx) => (
              <CategoryCard
                key={sav.id}
                category={sav}
                colorIndex={savIdx}
                colors={['#34d399', '#059669', '#10b981', '#047857', '#6ee7b7', '#0d9488', '#2dd4bf', '#065f46', '#a7f3d0', '#15803d']}
                onUpdateCategory={(field, value) => updateSaving(sav.id, field, value)}
                onRemoveCategory={() => removeSaving(sav.id)}
                onUpdateSubItem={(subId, field, value) => updateSavingSubItem(sav.id, subId, field, value)}
                onAddSubItem={() => addSavingSubItem(sav.id)}
                onRemoveSubItem={(subId) => removeSavingSubItem(sav.id, subId)}
                subPlaceholder="z.B. MSCI World"
                catPlaceholder="z.B. ETF-Sparplan"
              />
            ))}
            <button
              type="button"
              onClick={addSaving}
              className="w-full text-xs px-3 py-2.5 rounded-xl transition-colors font-medium flex items-center justify-center gap-1.5 border border-dashed"
              style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', borderColor: 'rgba(16,185,129,0.2)' }}
              aria-label="Spar-Kategorie hinzufügen"
            >
              <Plus className="w-3.5 h-3.5" />
              Kategorie hinzufügen
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

function formatCurrencyCompact(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ── CategoryCard Sub-Component ───────────────────────────────────

interface CategoryCardProps {
  category: SankeyExpenseCategory;
  colorIndex: number;
  colors: string[];
  onUpdateCategory: (field: keyof SankeyExpenseCategory, value: string | number) => void;
  onRemoveCategory: () => void;
  onUpdateSubItem: (subId: string, field: keyof SankeyExpenseSubItem, value: string | number) => void;
  onAddSubItem: () => void;
  onRemoveSubItem: (subId: string) => void;
  catPlaceholder?: string;
  subPlaceholder?: string;
}

function CategoryCard({
  category: cat,
  colorIndex,
  colors,
  onUpdateCategory,
  onRemoveCategory,
  onUpdateSubItem,
  onAddSubItem,
  onRemoveSubItem,
  catPlaceholder = 'z.B. Wohnen',
  subPlaceholder = 'z.B. Miete',
}: CategoryCardProps) {
  const color = colors[colorIndex % colors.length];
  const subTotal = cat.subItems.reduce((s, sub) => s + (sub.amount > 0 ? sub.amount : 0), 0);
  const diff = cat.amount - subTotal;
  const hasSubWarning = cat.subItems.length > 0 && Math.abs(diff) > 0.5;

  return (
    <div className="group/cat bg-background-elevated rounded-xl border border-border p-4 transition-all hover:border-border-light hover:shadow-sm">
      {/* Kategorie Header */}
      <div className="flex items-center gap-2.5 mb-1">
        <div
          className="w-3 h-3 rounded-sm flex-shrink-0"
          style={{ backgroundColor: color, boxShadow: `0 0 0 2px ${color}40` }}
        />
        <input
          type="text"
          value={cat.name}
          onChange={(e) => onUpdateCategory('name', e.target.value)}
          placeholder={catPlaceholder}
          className="flex-1 bg-transparent text-sm font-medium text-text-primary placeholder:text-text-tertiary outline-none min-w-0"
          aria-label="Kategoriename"
        />
        <div className="relative flex-shrink-0">
          <input
            type="number"
            value={cat.amount || ''}
            onChange={(e) => onUpdateCategory('amount', parseFloat(e.target.value) || 0)}
            placeholder="0"
            min="0"
            step="50"
            className="w-24 pr-5 bg-transparent text-sm text-right font-bold text-text-primary tabular-nums placeholder:text-text-tertiary outline-none"
            aria-label="Betrag"
          />
          <span className="absolute right-0 top-1/2 -translate-y-1/2 text-text-tertiary text-xs pointer-events-none">€</span>
        </div>
        <button
          type="button"
          onClick={onRemoveCategory}
          className="flex-shrink-0 ml-1 p-1.5 text-text-tertiary sm:text-text-tertiary/0 sm:group-hover/cat:text-text-tertiary hover:!text-loss transition-all rounded-lg hover:bg-loss/10"
          title="Kategorie entfernen"
          aria-label={`${cat.name || 'Kategorie'} entfernen`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Sub-Items Progress (mini bar zeigt wie viel vom Budget aufgeteilt) */}
      {cat.subItems.length > 0 && cat.amount > 0 && (
        <div className="ml-5 mb-3 mt-2">
          <div className="h-1 w-full bg-background rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min((subTotal / cat.amount) * 100, 100)}%`,
                backgroundColor: color + 'aa',
              }}
            />
          </div>
          <div className="text-[9px] text-text-tertiary mt-0.5 tabular-nums">
            {formatCurrencyCompact(subTotal)} von {formatCurrencyCompact(cat.amount)} aufgeteilt
          </div>
        </div>
      )}

      {/* Unterkategorien */}
      {cat.subItems.length > 0 && (
        <div className="ml-5 pl-4 border-l-2 border-border space-y-2 mb-3">
          {cat.subItems.map((sub) => (
            <div key={sub.id} className="group/sub flex items-center gap-2">
              <input
                type="text"
                value={sub.name}
                onChange={(e) => onUpdateSubItem(sub.id, 'name', e.target.value)}
                placeholder={subPlaceholder}
                className="flex-1 bg-transparent text-sm text-text-secondary placeholder:text-text-tertiary outline-none min-w-0"
                aria-label="Unterkategorie-Name"
              />
              <div className="relative flex-shrink-0">
                <input
                  type="number"
                  value={sub.amount || ''}
                  onChange={(e) => onUpdateSubItem(sub.id, 'amount', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  min="0"
                  step="10"
                  className="w-20 pr-5 bg-transparent text-sm text-right text-text-secondary tabular-nums placeholder:text-text-tertiary outline-none"
                  aria-label="Betrag"
                />
                <span className="absolute right-0 top-1/2 -translate-y-1/2 text-text-tertiary text-xs pointer-events-none">€</span>
              </div>
              <button
                type="button"
                onClick={() => onRemoveSubItem(sub.id)}
                className="flex-shrink-0 ml-1 p-1 text-text-tertiary sm:text-text-tertiary/0 sm:group-hover/sub:text-text-tertiary hover:!text-loss transition-all rounded hover:bg-loss/10"
                title="Entfernen"
                aria-label={`${sub.name || 'Unterkategorie'} entfernen`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Sub-Item hinzufügen */}
      <button
        type="button"
        onClick={onAddSubItem}
        className="ml-5 text-xs text-text-tertiary hover:text-text-secondary transition-colors flex items-center gap-1"
        aria-label="Unterkategorie hinzufügen"
      >
        <Plus className="w-3.5 h-3.5" />
        Unterkategorie
      </button>

      {/* Sub-Total Hinweis */}
      {hasSubWarning && (
        <div className={`mt-2 ml-5 text-xs flex items-center gap-1.5 ${diff > 0 ? 'text-text-tertiary' : 'text-loss'}`}>
          {diff < 0 && <AlertTriangle className="w-3 h-3 flex-shrink-0" />}
          {diff > 0
            ? `${formatCurrencyCompact(diff)} noch nicht aufgeteilt`
            : `Überschreitung um ${formatCurrencyCompact(Math.abs(diff))}`}
        </div>
      )}
    </div>
  );
}
