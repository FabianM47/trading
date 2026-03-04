'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, Trash2, Plus, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import type { PriceAlert, CreatePriceAlertInput } from '@/types';
import { formatCurrency } from '@/lib/calculations';
import ConfirmModal from './ConfirmModal';

interface PriceAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Vorausgefüllte Werte beim Erstellen eines Alerts aus einer Position */
  prefill?: {
    isin: string;
    ticker?: string;
    name: string;
    currentPrice?: number;
  };
}

export default function PriceAlertModal({ isOpen, onClose, prefill }: PriceAlertModalProps) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [alertToDelete, setAlertToDelete] = useState<PriceAlert | null>(null);
  
  // Form State
  const [formIsin, setFormIsin] = useState('');
  const [formTicker, setFormTicker] = useState('');
  const [formName, setFormName] = useState('');
  const [formTargetPrice, setFormTargetPrice] = useState('');
  const [formDirection, setFormDirection] = useState<'above' | 'below'>('above');
  const [formRepeat, setFormRepeat] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Alerts laden
  const loadAlerts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/alerts');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      } else {
        setError('Alerts konnten nicht geladen werden');
      }
    } catch {
      setError('Netzwerkfehler beim Laden der Alerts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadAlerts();
      setError(null);
      
      // Prefill Form wenn vorhanden
      if (prefill) {
        setFormIsin(prefill.isin);
        setFormTicker(prefill.ticker || '');
        setFormName(prefill.name);
        setFormTargetPrice(prefill.currentPrice?.toFixed(2) || '');
        setShowCreateForm(true);
      }
    }
  }, [isOpen, prefill, loadAlerts]);

  // Alert erstellen
  const handleCreate = async () => {
    if (!formIsin || !formName || !formTargetPrice) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const input: CreatePriceAlertInput = {
        isin: formIsin,
        ticker: formTicker || undefined,
        name: formName,
        targetPrice: parseFloat(formTargetPrice),
        direction: formDirection,
        repeat: formRepeat,
      };
      
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      
      if (res.ok) {
        await loadAlerts();
        resetForm();
        setShowCreateForm(false);
      } else {
        const data = await res.json();
        setError(data.error || 'Alert konnte nicht erstellt werden');
      }
    } catch {
      setError('Netzwerkfehler');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Alert aktivieren/deaktivieren
  const handleToggle = async (alert: PriceAlert) => {
    try {
      const res = await fetch('/api/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: alert.id, isActive: !alert.isActive }),
      });
      
      if (res.ok) {
        await loadAlerts();
      }
    } catch {
      setError('Fehler beim Aktualisieren');
    }
  };

  // Alert löschen
  const handleDelete = async (alertId: string) => {
    try {
      const res = await fetch(`/api/alerts?id=${alertId}`, { method: 'DELETE' });
      if (res.ok) {
        setAlerts(prev => prev.filter(a => a.id !== alertId));
      }
    } catch {
      setError('Fehler beim Löschen');
    }
    setAlertToDelete(null);
  };

  const resetForm = () => {
    setFormIsin('');
    setFormTicker('');
    setFormName('');
    setFormTargetPrice('');
    setFormDirection('above');
    setFormRepeat(false);
  };

  if (!isOpen) return null;

  const activeAlerts = alerts.filter(a => a.isActive);
  const inactiveAlerts = alerts.filter(a => !a.isActive);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-background-card rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border-2 border-border">
        {/* Header */}
        <div className="px-6 py-4 border-b-2 border-border bg-background-elevated">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-accent" />
              <div>
                <h2 className="text-xl font-semibold text-text-primary">Preis-Alarme</h2>
                <p className="text-sm text-text-secondary">
                  {activeAlerts.length} aktiv{activeAlerts.length !== 1 ? 'e' : 'er'} Alarm{activeAlerts.length !== 1 ? 'e' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-loss/10 border border-loss/30 rounded-lg text-sm text-loss">
              {error}
            </div>
          )}

          {/* Neuen Alert erstellen */}
          {showCreateForm ? (
            <div className="mb-6 p-4 bg-background-elevated rounded-lg border border-border">
              <h3 className="text-sm font-semibold text-text-primary mb-4">Neuer Preis-Alarm</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">ISIN / Ticker</label>
                  <input
                    type="text"
                    value={formIsin}
                    onChange={e => setFormIsin(e.target.value)}
                    placeholder="z.B. US0378331005"
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-text-primary placeholder-text-tertiary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="z.B. Apple Inc."
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-text-primary placeholder-text-tertiary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Zielpreis (EUR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formTargetPrice}
                    onChange={e => setFormTargetPrice(e.target.value)}
                    placeholder="150.00"
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-text-primary placeholder-text-tertiary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Richtung</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormDirection('above')}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        formDirection === 'above'
                          ? 'bg-profit/20 text-profit border border-profit/40'
                          : 'bg-background border border-border text-text-secondary'
                      }`}
                    >
                      <ArrowUp className="w-4 h-4" /> Über
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormDirection('below')}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        formDirection === 'below'
                          ? 'bg-loss/20 text-loss border border-loss/40'
                          : 'bg-background border border-border text-text-secondary'
                      }`}
                    >
                      <ArrowDown className="w-4 h-4" /> Unter
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="mt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formRepeat}
                    onChange={e => setFormRepeat(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-text-secondary">Wiederholen (Alert bleibt nach Auslösung aktiv)</span>
                </label>
              </div>
              
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleCreate}
                  disabled={isSubmitting || !formIsin || !formName || !formTargetPrice}
                  className="flex-1 px-4 py-2 bg-accent text-white rounded-md hover:bg-accent/90 transition-colors font-medium text-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Erstellen...' : 'Alert erstellen'}
                </button>
                <button
                  onClick={() => { setShowCreateForm(false); resetForm(); }}
                  className="px-4 py-2 bg-background border border-border rounded-md text-text-secondary hover:text-text-primary transition-colors text-sm"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full mb-6 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg text-text-secondary hover:text-text-primary hover:border-accent/50 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Neuen Alarm erstellen</span>
            </button>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="text-center py-8 text-text-secondary">
              Alerts werden geladen...
            </div>
          )}

          {/* Alert Liste */}
          {!isLoading && alerts.length === 0 && (
            <div className="text-center py-8 text-text-secondary">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg mb-1">Keine Alarme</p>
              <p className="text-sm">Erstelle deinen ersten Preis-Alarm!</p>
            </div>
          )}

          {!isLoading && activeAlerts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs uppercase tracking-wider text-text-tertiary font-medium mb-2">Aktive Alarme</h3>
              {activeAlerts.map(alert => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  onToggle={handleToggle}
                  onDelete={() => setAlertToDelete(alert)}
                />
              ))}
            </div>
          )}

          {!isLoading && inactiveAlerts.length > 0 && (
            <div className="space-y-2 mt-6">
              <h3 className="text-xs uppercase tracking-wider text-text-tertiary font-medium mb-2">Ausgelöste / Inaktive</h3>
              {inactiveAlerts.map(alert => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  onToggle={handleToggle}
                  onDelete={() => setAlertToDelete(alert)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t-2 border-border bg-background-elevated">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-accent text-white rounded-md hover:bg-accent/90 transition-colors font-semibold shadow-lg"
          >
            Schließen
          </button>
        </div>
      </div>

      {/* Confirm Delete */}
      <ConfirmModal
        isOpen={!!alertToDelete}
        title="Alarm löschen"
        message={`Möchtest du den Alarm für "${alertToDelete?.name}" wirklich löschen?`}
        confirmText="Löschen"
        cancelText="Abbrechen"
        variant="danger"
        onConfirm={() => alertToDelete && handleDelete(alertToDelete.id)}
        onCancel={() => setAlertToDelete(null)}
      />
    </div>
  );
}

// ==========================================
// AlertRow Subkomponente
// ==========================================

function AlertRow({ 
  alert, 
  onToggle, 
  onDelete 
}: { 
  alert: PriceAlert; 
  onToggle: (alert: PriceAlert) => void;
  onDelete: () => void;
}) {
  const isAbove = alert.direction === 'above';
  
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
      alert.isActive 
        ? 'bg-background-card border-border hover:bg-background-elevated' 
        : 'bg-background border-border/50 opacity-60'
    }`}>
      {/* Direction Indicator */}
      <div className={`p-1.5 rounded-md ${isAbove ? 'bg-profit/15 text-profit' : 'bg-loss/15 text-loss'}`}>
        {isAbove ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-text-primary truncate">{alert.name}</span>
          {alert.repeat && (
            <span title="Wiederholt">
              <RefreshCw className="w-3 h-3 text-text-tertiary flex-shrink-0" />
            </span>
          )}
        </div>
        <div className="text-xs text-text-secondary mt-0.5">
          {isAbove ? 'Über' : 'Unter'} {formatCurrency(alert.targetPrice)}
          {alert.lastCheckedPrice && (
            <span className="text-text-tertiary ml-2">
              (Aktuell: {formatCurrency(alert.lastCheckedPrice)})
            </span>
          )}
        </div>
        {alert.triggeredAt && (
          <div className="text-[10px] text-accent mt-0.5">
            Ausgelöst am {new Date(alert.triggeredAt).toLocaleDateString('de-DE', {
              day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </div>
        )}
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={() => onToggle(alert)}
          className="p-1.5 rounded-md hover:bg-background-elevated transition-colors"
          title={alert.isActive ? 'Deaktivieren' : 'Aktivieren'}
        >
          {alert.isActive ? (
            <Bell className="w-4 h-4 text-accent" />
          ) : (
            <BellOff className="w-4 h-4 text-text-tertiary" />
          )}
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-md hover:bg-loss/10 transition-colors"
          title="Löschen"
        >
          <Trash2 className="w-4 h-4 text-text-tertiary hover:text-loss" />
        </button>
      </div>
    </div>
  );
}
