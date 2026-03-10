'use client';

import { HelpCircle } from 'lucide-react';
import { useState } from 'react';

interface SelectorConfigProps {
  selectors: {
    articleList: string;
    title: string;
    summary?: string;
    date?: string;
    link?: string;
    image?: string;
  };
  onChange: (selectors: SelectorConfigProps['selectors']) => void;
}

interface SelectorField {
  key: keyof SelectorConfigProps['selectors'];
  label: string;
  placeholder: string;
  required: boolean;
  help: string;
}

const FIELDS: SelectorField[] = [
  {
    key: 'articleList',
    label: 'Artikel-Container',
    placeholder: 'article.news-item',
    required: true,
    help: 'CSS-Selektor fuer den Artikel-Container. Jedes passende Element wird als ein Artikel behandelt.',
  },
  {
    key: 'title',
    label: 'Titel',
    placeholder: 'h2 a',
    required: true,
    help: 'CSS-Selektor fuer den Artikel-Titel innerhalb des Containers.',
  },
  {
    key: 'summary',
    label: 'Zusammenfassung',
    placeholder: 'p.excerpt',
    required: false,
    help: 'CSS-Selektor fuer die Artikel-Zusammenfassung oder Beschreibung.',
  },
  {
    key: 'date',
    label: 'Datum',
    placeholder: 'time[datetime]',
    required: false,
    help: 'CSS-Selektor fuer das Veroeffentlichungsdatum. Wenn das Element ein datetime-Attribut hat, wird dieses bevorzugt.',
  },
  {
    key: 'link',
    label: 'Link',
    placeholder: 'h2 a[href]',
    required: false,
    help: 'CSS-Selektor fuer den Artikel-Link. Falls leer, wird der Link aus dem Titel-Element extrahiert.',
  },
  {
    key: 'image',
    label: 'Bild',
    placeholder: 'img.thumbnail',
    required: false,
    help: 'CSS-Selektor fuer das Artikel-Vorschaubild.',
  },
];

export default function SelectorConfig({ selectors, onChange }: SelectorConfigProps) {
  const [showHelp, setShowHelp] = useState<string | null>(null);

  const handleChange = (key: keyof SelectorConfigProps['selectors'], value: string) => {
    onChange({ ...selectors, [key]: value || undefined });
  };

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
        CSS-Selektoren
      </h4>
      {FIELDS.map((field) => (
        <div key={field.key}>
          <div className="mb-1 flex items-center gap-1">
            <label className="text-xs text-zinc-400">
              {field.label}
              {field.required && <span className="text-red-400 ml-0.5">*</span>}
            </label>
            <button
              type="button"
              onClick={() => setShowHelp(showHelp === field.key ? null : field.key)}
              className="text-zinc-600 hover:text-zinc-400"
            >
              <HelpCircle size={12} />
            </button>
          </div>
          {showHelp === field.key && (
            <p className="mb-1 text-xs text-zinc-500 bg-zinc-800/50 rounded px-2 py-1">
              {field.help}
            </p>
          )}
          <input
            type="text"
            value={(selectors[field.key] as string) || ''}
            onChange={(e) => handleChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 font-mono placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none"
          />
        </div>
      ))}
    </div>
  );
}
