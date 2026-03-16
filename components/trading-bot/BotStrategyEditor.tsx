'use client';

import { useState } from 'react';
import { ArrowLeft, Save, FileDown, Loader2, Eye, Edit3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { BotStrategy } from '@/types/trading-bot';
import { AVAILABLE_TEMPLATES } from '@/lib/trading-bot/strategyTemplate';

interface BotStrategyEditorProps {
  strategy?: BotStrategy;
  onSave: (data: { name: string; slug: string; description?: string; markdownContent: string }) => Promise<void>;
  onCancel: () => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äÄ]/g, 'ae')
    .replace(/[öÖ]/g, 'oe')
    .replace(/[üÜ]/g, 'ue')
    .replace(/[ß]/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function BotStrategyEditor({ strategy, onSave, onCancel }: BotStrategyEditorProps) {
  const [name, setName] = useState(strategy?.name || '');
  const [slug, setSlug] = useState(strategy?.slug || '');
  const [description, setDescription] = useState(strategy?.description || '');
  const [content, setContent] = useState(strategy?.markdownContent || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [autoSlug, setAutoSlug] = useState(!strategy);

  const handleNameChange = (value: string) => {
    setName(value);
    if (autoSlug) {
      setSlug(slugify(value));
    }
  };

  const handleLoadTemplate = (templateContent: string) => {
    setContent(templateContent);
    setShowTemplateMenu(false);
  };

  const handleSave = async () => {
    if (!name.trim() || !slug.trim() || !content.trim()) return;
    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        markdownContent: content,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onCancel}
          className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft size={16} />
          Zurueck
        </button>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowTemplateMenu(!showTemplateMenu)}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:bg-zinc-700 transition-colors inline-flex items-center gap-2"
            >
              <FileDown size={14} />
              Vorlage laden
            </button>
            {showTemplateMenu && (
              <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-10 w-64">
                {AVAILABLE_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => handleLoadTemplate(tpl.content)}
                    className="block w-full text-left px-4 py-3 hover:bg-zinc-700 transition-colors first:rounded-t-lg last:rounded-b-lg"
                  >
                    <div className="text-sm text-zinc-100">{tpl.name}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{tpl.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving || !name.trim() || !slug.trim() || !content.trim()}
            className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Speichern
          </button>
        </div>
      </div>

      {/* Name, Slug, Description */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1 block">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="z.B. Swing Trading 4H"
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-white"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1 block">Slug</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setAutoSlug(false);
            }}
            placeholder="z.B. swing-trading-4h"
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-white"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1 block">Beschreibung (optional)</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Kurze Beschreibung der Strategie"
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-white"
        />
      </div>

      {/* Editor / Preview Toggle */}
      <div className="flex gap-1 bg-zinc-900/50 rounded-lg p-1 border border-zinc-800">
        <button
          onClick={() => setShowPreview(false)}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${
            !showPreview ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Edit3 size={14} />
          Editor
        </button>
        <button
          onClick={() => setShowPreview(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${
            showPreview ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Eye size={14} />
          Vorschau
        </button>
      </div>

      {/* Content Area */}
      {!showPreview ? (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="# Strategie-Name&#10;&#10;## Meta&#10;- **Zeitrahmen**: ...&#10;&#10;Markdown hier eingeben..."
          className="w-full h-[500px] px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 font-mono resize-y focus:outline-none focus:ring-2 focus:ring-white leading-relaxed"
          spellCheck={false}
        />
      ) : (
        <div className="w-full min-h-[500px] px-6 py-4 bg-zinc-900 border border-zinc-800 rounded-lg overflow-auto">
          {content ? (
            <div className="prose prose-invert prose-sm max-w-none prose-headings:text-zinc-100 prose-p:text-zinc-300 prose-li:text-zinc-300 prose-strong:text-zinc-200 prose-code:text-zinc-300 prose-code:bg-zinc-800 prose-code:px-1 prose-code:rounded prose-th:text-zinc-300 prose-td:text-zinc-400 prose-table:border-zinc-700 prose-hr:border-zinc-700">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-zinc-500 text-sm italic">Kein Inhalt zum Anzeigen</p>
          )}
        </div>
      )}
    </div>
  );
}
