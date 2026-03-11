'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ArrowLeft, Plus } from 'lucide-react';
import SourceList from '@/components/news/sources/SourceList';
import SourceForm from '@/components/news/sources/SourceForm';
import type { NewsSource, NewsSourcesResponse } from '@/types/news';
import RoleGate from '@/components/RoleGate';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function NewsSourcesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingSource, setEditingSource] = useState<NewsSource | null>(null);

  const { data, mutate, isLoading } = useSWR<NewsSourcesResponse>(
    '/api/news/sources',
    fetcher,
    { revalidateOnFocus: false }
  );

  const builtinSources = (data?.builtin || []) as NewsSource[];
  const customSources = (data?.custom || []) as NewsSource[];

  const handleToggle = async (id: string, enabled: boolean) => {
    await fetch('/api/news/sources', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isEnabled: enabled }),
    });
    mutate();
  };

  const handleSave = async (formData: {
    name: string;
    providerType: 'rss' | 'website';
    config: Record<string, unknown>;
  }) => {
    if (editingSource) {
      const res = await fetch('/api/news/sources', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingSource.id, ...formData }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Aktualisieren');
      }
    } else {
      const res = await fetch('/api/news/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Erstellen');
      }
    }

    setShowForm(false);
    setEditingSource(null);
    mutate();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Quelle wirklich loeschen?')) return;

    await fetch(`/api/news/sources?id=${id}`, { method: 'DELETE' });
    mutate();
  };

  const handleEdit = (source: NewsSource) => {
    setEditingSource(source);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingSource(null);
  };

  return (
    <RoleGate role="admin">
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/news"
            className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft size={16} />
            Zurueck
          </Link>
          <h1 className="text-lg font-bold text-zinc-100">Quellen verwalten</h1>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse h-16 rounded-lg border border-zinc-800 bg-zinc-900/50" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Built-in Sources */}
          <SourceList
            title="Eingebaute Quellen"
            sources={builtinSources}
            editable={false}
            onToggle={handleToggle}
          />
          {builtinSources.length > 0 && (
            <p className="text-xs text-zinc-600 -mt-4">
              Eingebaute Quellen koennen aktiviert/deaktiviert, aber nicht geloescht werden.
            </p>
          )}

          {/* Custom Sources */}
          <SourceList
            title="Eigene Quellen"
            sources={customSources}
            editable={true}
            onToggle={handleToggle}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />

          {/* Add Button / Form */}
          {showForm ? (
            <SourceForm
              onSave={handleSave}
              onCancel={handleCancel}
              initialData={
                editingSource
                  ? {
                      name: editingSource.name,
                      providerType: editingSource.providerType as 'rss' | 'website',
                      config: editingSource.config,
                    }
                  : undefined
              }
            />
          ) : (
            <button
              onClick={() => {
                setEditingSource(null);
                setShowForm(true);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 py-4 text-sm text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
            >
              <Plus size={16} />
              Neue Quelle hinzufuegen
            </button>
          )}
        </div>
      )}
    </div>
    </RoleGate>
  );
}
