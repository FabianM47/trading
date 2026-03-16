'use client';

import { useState, useEffect } from 'react';
import { Loader2, Save } from 'lucide-react';
import type { BotUserConfig, BotNotificationConfig } from '@/types/trading-bot';

interface BotSettingsTabProps {
  config: BotUserConfig | null;
  notifications: BotNotificationConfig | null;
  onSaveConfig: (updates: Partial<BotUserConfig>) => Promise<void>;
  onSaveNotifications: (updates: Partial<BotNotificationConfig>) => Promise<void>;
  onInitConfig: () => Promise<void>;
  onTogglePortfolio: (enabled: boolean) => Promise<void>;
}

export default function BotSettingsTab({
  config,
  notifications,
  onSaveConfig,
  onSaveNotifications,
  onInitConfig,
  onTogglePortfolio,
}: BotSettingsTabProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [budget, setBudget] = useState('10000');
  const [maxPositions, setMaxPositions] = useState('5');
  const [maxPositionSize, setMaxPositionSize] = useState('20');

  // Notification states
  const [notifySignal, setNotifySignal] = useState(true);
  const [notifyTradeOpen, setNotifyTradeOpen] = useState(true);
  const [notifyTradeClose, setNotifyTradeClose] = useState(true);
  const [notifyStopLoss, setNotifyStopLoss] = useState(true);
  const [notifyPush, setNotifyPush] = useState(true);
  const [notifyChat, setNotifyChat] = useState(true);

  useEffect(() => {
    if (config) {
      setBudget(config.virtualBudget.toString());
      setMaxPositions(config.maxPositions.toString());
      setMaxPositionSize(config.maxPositionSizePct.toString());
    }
  }, [config]);

  useEffect(() => {
    if (notifications) {
      setNotifySignal(notifications.notifyOnSignal);
      setNotifyTradeOpen(notifications.notifyOnTradeOpen);
      setNotifyTradeClose(notifications.notifyOnTradeClose);
      setNotifyStopLoss(notifications.notifyOnStopLoss);
      setNotifyPush(notifications.notifyViaPush);
      setNotifyChat(notifications.notifyViaChat);
    }
  }, [notifications]);

  if (!config) {
    return (
      <div className="bg-zinc-900/50 rounded-lg p-8 border border-zinc-800 text-center">
        <p className="text-zinc-400 mb-4">Bot wurde noch nicht eingerichtet.</p>
        <button
          onClick={async () => {
            setIsSaving(true);
            await onInitConfig();
            setIsSaving(false);
          }}
          disabled={isSaving}
          className="bg-white text-black px-6 py-2.5 rounded-lg font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
        >
          {isSaving && <Loader2 size={16} className="animate-spin" />}
          Bot einrichten
        </button>
      </div>
    );
  }

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      await onSaveConfig({
        virtualBudget: parseFloat(budget) || 10000,
        maxPositions: parseInt(maxPositions) || 5,
        maxPositionSizePct: parseFloat(maxPositionSize) || 20,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    try {
      await onSaveNotifications({
        notifyOnSignal: notifySignal,
        notifyOnTradeOpen: notifyTradeOpen,
        notifyOnTradeClose: notifyTradeClose,
        notifyOnStopLoss: notifyStopLoss,
        notifyViaPush: notifyPush,
        notifyViaChat: notifyChat,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Budget Section */}
      <div className="bg-zinc-900/50 rounded-lg p-5 border border-zinc-800">
        <h3 className="text-sm font-medium text-zinc-300 mb-4">Budget</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1 block">
              Virtuelles Budget (EUR)
            </label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-white"
              min="0"
              step="1000"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1 block">
              Verfügbar
            </label>
            <div className="px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-sm text-zinc-400">
              {config.remainingBudget.toLocaleString('de-DE', { minimumFractionDigits: 2 })} EUR
            </div>
          </div>
        </div>
      </div>

      {/* Risk Management */}
      <div className="bg-zinc-900/50 rounded-lg p-5 border border-zinc-800">
        <h3 className="text-sm font-medium text-zinc-300 mb-4">Risiko-Management</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1 block">
              Max. offene Positionen
            </label>
            <input
              type="number"
              value={maxPositions}
              onChange={(e) => setMaxPositions(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-white"
              min="1"
              max="50"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1 block">
              Max. Positionsgröße (% des Budgets)
            </label>
            <input
              type="number"
              value={maxPositionSize}
              onChange={(e) => setMaxPositionSize(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-white"
              min="1"
              max="100"
            />
          </div>
        </div>
        <button
          onClick={handleSaveConfig}
          disabled={isSaving}
          className="mt-4 bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Speichern
        </button>
      </div>

      {/* Portfolio Integration */}
      <div className="bg-zinc-900/50 rounded-lg p-5 border border-zinc-800">
        <h3 className="text-sm font-medium text-zinc-300 mb-2">Portfolio-Integration</h3>
        <p className="text-xs text-zinc-500 mb-4">
          Wenn aktiviert, werden Bot-Trades im Hauptportfolio angezeigt und in die Gesamtberechnung einbezogen.
        </p>
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            className={`relative w-11 h-6 rounded-full transition-colors ${
              config.includeInPortfolio ? 'bg-green-500' : 'bg-zinc-700'
            }`}
            onClick={() => onTogglePortfolio(!config.includeInPortfolio)}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                config.includeInPortfolio ? 'translate-x-5' : ''
              }`}
            />
          </div>
          <span className="text-sm text-zinc-300">
            {config.includeInPortfolio ? 'Aktiviert' : 'Deaktiviert'}
          </span>
        </label>
      </div>

      {/* Notifications */}
      <div className="bg-zinc-900/50 rounded-lg p-5 border border-zinc-800">
        <h3 className="text-sm font-medium text-zinc-300 mb-4">Benachrichtigungen</h3>
        <div className="space-y-3">
          <h4 className="text-xs text-zinc-500 uppercase tracking-wide">Ereignisse</h4>
          {[
            { label: 'Bei neuem Signal', value: notifySignal, setter: setNotifySignal },
            { label: 'Bei Trade-Eröffnung', value: notifyTradeOpen, setter: setNotifyTradeOpen },
            { label: 'Bei Trade-Schließung', value: notifyTradeClose, setter: setNotifyTradeClose },
            { label: 'Bei Stop-Loss', value: notifyStopLoss, setter: setNotifyStopLoss },
          ].map(({ label, value, setter }) => (
            <label key={label} className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-zinc-300">{label}</span>
              <div
                className={`relative w-9 h-5 rounded-full transition-colors ${
                  value ? 'bg-green-500' : 'bg-zinc-700'
                }`}
                onClick={() => setter(!value)}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                    value ? 'translate-x-4' : ''
                  }`}
                />
              </div>
            </label>
          ))}

          <div className="border-t border-zinc-800 my-3 pt-3">
            <h4 className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Kanäle</h4>
            {[
              { label: 'Push-Benachrichtigungen', value: notifyPush, setter: setNotifyPush },
              { label: 'Chat-Nachrichten', value: notifyChat, setter: setNotifyChat },
            ].map(({ label, value, setter }) => (
              <label key={label} className="flex items-center justify-between cursor-pointer mb-3">
                <span className="text-sm text-zinc-300">{label}</span>
                <div
                  className={`relative w-9 h-5 rounded-full transition-colors ${
                    value ? 'bg-green-500' : 'bg-zinc-700'
                  }`}
                  onClick={() => setter(!value)}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                      value ? 'translate-x-4' : ''
                    }`}
                  />
                </div>
              </label>
            ))}
          </div>
        </div>
        <button
          onClick={handleSaveNotifications}
          disabled={isSaving}
          className="mt-2 bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Speichern
        </button>
      </div>
    </div>
  );
}
