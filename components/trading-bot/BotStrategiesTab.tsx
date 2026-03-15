'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, Check, FileText, Loader2 } from 'lucide-react';
import type { BotStrategy } from '@/types/trading-bot';
import BotStrategyEditor from './BotStrategyEditor';

interface BotStrategiesTabProps {
  strategies: BotStrategy[];
  isLoading: boolean;
  onSave: (data: { name: string; slug: string; description?: string; markdownContent: string; isActive?: boolean }) => Promise<void>;
  onUpdate: (data: { id: string; name?: string; slug?: string; description?: string; markdownContent?: string; isActive?: boolean }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onActivate: (id: string) => Promise<void>;
}

export default function BotStrategiesTab({
  strategies,
  isLoading,
  onSave,
  onUpdate,
  onDelete,
  onActivate,
}: BotStrategiesTabProps) {
  const [editingStrategy, setEditingStrategy] = useState<BotStrategy | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800 animate-pulse h-24" />
        ))}
      </div>
    );
  }

  // Show editor if creating or editing
  if (isCreating || editingStrategy) {
    return (
      <BotStrategyEditor
        strategy={editingStrategy || undefined}
        onSave={async (data) => {
          if (editingStrategy) {
            await onUpdate({ id: editingStrategy.id, ...data });
          } else {
            await onSave(data);
          }
          setEditingStrategy(null);
          setIsCreating(false);
        }}
        onCancel={() => {
          setEditingStrategy(null);
          setIsCreating(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-zinc-400">
          {strategies.length} {strategies.length === 1 ? 'Strategie' : 'Strategien'}
        </h3>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors inline-flex items-center gap-2"
        >
          <Plus size={14} />
          Neue Strategie
        </button>
      </div>

      {strategies.length === 0 ? (
        <div className="bg-zinc-900/50 rounded-lg p-8 border border-zinc-800 text-center">
          <FileText size={32} className="mx-auto mb-3 text-zinc-500" />
          <p className="text-zinc-400 text-sm mb-4">Noch keine Strategien erstellt.</p>
          <button
            onClick={() => setIsCreating(true)}
            className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors inline-flex items-center gap-2"
          >
            <Plus size={14} />
            Erste Strategie erstellen
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {strategies.map((strategy) => (
            <div
              key={strategy.id}
              className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-zinc-100 truncate">{strategy.name}</h4>
                    {strategy.isActive && (
                      <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                        <Check size={10} />
                        Aktiv
                      </span>
                    )}
                  </div>
                  {strategy.description && (
                    <p className="text-xs text-zinc-500 mt-1 truncate">{strategy.description}</p>
                  )}
                  <p className="text-xs text-zinc-600 mt-1">
                    Erstellt: {new Date(strategy.createdAt).toLocaleDateString('de-DE')}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-3">
                  {!strategy.isActive && (
                    <button
                      onClick={() => onActivate(strategy.id)}
                      className="p-2 text-zinc-500 hover:text-green-400 transition-colors"
                      title="Aktivieren"
                    >
                      <Check size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => setEditingStrategy(strategy)}
                    className="p-2 text-zinc-500 hover:text-zinc-200 transition-colors"
                    title="Bearbeiten"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm('Strategie wirklich loeschen?')) {
                        setDeletingId(strategy.id);
                        await onDelete(strategy.id);
                        setDeletingId(null);
                      }
                    }}
                    disabled={deletingId === strategy.id}
                    className="p-2 text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-50"
                    title="Loeschen"
                  >
                    {deletingId === strategy.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
