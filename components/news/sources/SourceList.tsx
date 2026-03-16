'use client';

import { Trash2, Edit2, ToggleLeft, ToggleRight } from 'lucide-react';
import SourceTypeBadge from './SourceTypeBadge';
import type { NewsSource } from '@/types/news';

interface SourceListProps {
  title: string;
  sources: NewsSource[];
  editable: boolean;
  onToggle?: (id: string, enabled: boolean) => void;
  onEdit?: (source: NewsSource) => void;
  onDelete?: (id: string) => void;
}

export default function SourceList({
  title,
  sources,
  editable,
  onToggle,
  onEdit,
  onDelete,
}: SourceListProps) {
  if (sources.length === 0) return null;

  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
        {title}
      </h3>
      <div className="divide-y divide-zinc-800/50 rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        {sources.map((source) => (
          <div key={source.id} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              {/* Toggle */}
              <button
                onClick={() => onToggle?.(source.id, !source.isEnabled)}
                className={`transition-colors ${
                  source.isEnabled ? 'text-emerald-400' : 'text-zinc-600'
                }`}
                title={source.isEnabled ? 'Deaktivieren' : 'Aktivieren'}
              >
                {source.isEnabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
              </button>

              {/* Name + Type */}
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${source.isEnabled ? 'text-zinc-200' : 'text-zinc-500'}`}>
                    {source.name}
                  </span>
                  <SourceTypeBadge type={source.providerType} />
                </div>
                {source.config && typeof (source.config as Record<string, unknown>).url === 'string' && (
                  <p className="text-xs text-zinc-600 truncate max-w-xs">
                    {String((source.config as Record<string, unknown>).url)}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            {editable && (
              <div className="flex items-center gap-1">
                {onEdit && (
                  <button
                    onClick={() => onEdit(source)}
                    className="rounded p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                    title="Bearbeiten"
                  >
                    <Edit2 size={14} />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(source.id)}
                    className="rounded p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Löschen"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
