'use client';

import { useState } from 'react';
import { USERNAME_REGEX, USERNAME_RULES } from '@/lib/validation';

interface UsernameModalProps {
  onUsernameSet: (username: string) => void;
}

export default function UsernameModal({ onUsernameSet }: UsernameModalProps) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = username.trim();

    if (!USERNAME_REGEX.test(trimmed)) {
      setError(USERNAME_RULES);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/logto/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmed }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Fehler beim Speichern');
        return;
      }

      onUsernameSet(data.username);
    } catch {
      setError('Netzwerkfehler. Bitte versuche es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background-card rounded-2xl border border-border shadow-2xl w-full max-w-sm p-6">
        <h2 className="text-xl font-bold text-text-primary mb-2">Willkommen!</h2>
        <p className="text-sm text-text-secondary mb-6">
          Bitte vergib einen Benutzernamen, um fortzufahren.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wide font-medium">
              Benutzername
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              placeholder="z.B. max_trader"
              autoFocus
              minLength={3}
              maxLength={20}
              className="w-full px-4 py-3 bg-background-elevated border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-white transition-all text-white"
            />
            <p className="text-xs text-text-secondary mt-1.5">
              3-20 Zeichen, Buchstaben, Zahlen und Unterstrich
            </p>
            {error && (
              <p className="text-xs text-red-400 mt-1.5">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || username.trim().length < 3}
            className="w-full bg-white text-black px-4 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Wird gespeichert...' : 'Benutzername setzen'}
          </button>
        </form>
      </div>
    </div>
  );
}
