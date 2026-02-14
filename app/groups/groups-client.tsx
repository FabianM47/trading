/**
 * Groups Client Component
 * 
 * Interactive group management with:
 * - Create/Edit/Delete groups
 * - Color picker
 * - List of groups with instrument counts
 */

'use client';

import { createGroup, deleteGroup, updateGroup } from '@/app/actions/groups';
import { cn } from '@/lib/utils';
import { Check, Edit2, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';

interface Group {
  id: string;
  name: string;
  color: string | null;
  userId: string;
  createdAt: Date;
}

interface GroupsClientProps {
  initialGroups: Group[];
}

const defaultColors = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#10B981', // Green
  '#14B8A6', // Teal
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#6B7280', // Gray
];

export function GroupsClient({ initialGroups }: GroupsClientProps) {
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(defaultColors[0]);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Create group
  const handleCreate = async () => {
    if (!newName.trim()) {
      setError('Name ist erforderlich');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const result = await createGroup({
        name: newName.trim(),
        color: newColor,
      });

      if (result.success && result.group) {
        setGroups([...groups, result.group]);
        setNewName('');
        setNewColor(defaultColors[0]);
        setIsCreating(false);
      } else {
        setError(result.error || 'Fehler beim Erstellen');
      }
    } catch (err) {
      setError('Netzwerkfehler');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit group
  const startEdit = (group: Group) => {
    setEditingId(group.id);
    setEditName(group.name);
    setEditColor(group.color ?? defaultColors[0]);
    setError('');
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) {
      setError('Name ist erforderlich');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const result = await updateGroup(id, {
        name: editName.trim(),
        color: editColor,
      });

      if (result.success) {
        setGroups(
          groups.map((g) =>
            g.id === id ? { ...g, name: editName.trim(), color: editColor } : g
          )
        );
        setEditingId(null);
      } else {
        setError(result.error || 'Fehler beim Aktualisieren');
      }
    } catch (err) {
      setError('Netzwerkfehler');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete group
  const handleDelete = async (id: string) => {
    if (!confirm('Gruppe wirklich löschen?')) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const result = await deleteGroup(id);

      if (result.success) {
        setGroups(groups.filter((g) => g.id !== id));
      } else {
        setError(result.error || 'Fehler beim Löschen');
      }
    } catch (err) {
      setError('Netzwerkfehler');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Create New Group */}
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        {!isCreating ? (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            <Plus className="h-5 w-5" />
            Neue Gruppe
          </button>
        ) : (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Neue Gruppe erstellen
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="z.B. Tech-Aktien"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Farbe
              </label>
              <div className="flex flex-wrap gap-2">
                {defaultColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewColor(color)}
                    className={cn(
                      'w-10 h-10 rounded-lg border-2 transition-all',
                      newColor === color
                        ? 'border-gray-900 dark:border-gray-100 scale-110'
                        : 'border-gray-300 dark:border-gray-700'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Erstelle...' : 'Erstellen'}
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewName('');
                  setError('');
                }}
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 font-medium transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Groups List */}
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Meine Gruppen ({groups.length})
          </h3>
        </div>

        {groups.length === 0 ? (
          <div className="p-8 text-center text-gray-600 dark:text-gray-400">
            <p>Noch keine Gruppen erstellt.</p>
            <p className="text-sm mt-2">Erstelle deine erste Gruppe, um Instrumente zu organisieren.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {groups.map((group) => (
              <div key={group.id} className="p-4">
                {editingId === group.id ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Farbe
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {defaultColors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setEditColor(color)}
                            className={cn(
                              'w-10 h-10 rounded-lg border-2 transition-all',
                              editColor === color
                                ? 'border-gray-900 dark:border-gray-100 scale-110'
                                : 'border-gray-300 dark:border-gray-700'
                            )}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdate(group.id)}
                        disabled={isSubmitting}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" />
                        Speichern
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setError('');
                        }}
                        disabled={isSubmitting}
                        className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 font-medium transition-colors flex items-center gap-1"
                      >
                        <X className="h-4 w-4" />
                        Abbrechen
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded"
                        style={{ backgroundColor: group.color ?? '#6B7280' }}
                      />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {group.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Erstellt am {new Date(group.createdAt).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEdit(group)}
                        disabled={isSubmitting}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(group.id)}
                        disabled={isSubmitting}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>Tipp:</strong> Weise Instrumenten Gruppen zu, um sie im Dashboard zu filtern.
          Du kannst Gruppen auch auf der Instrument-Detail-Seite zuweisen.
        </p>
      </div>
    </div>
  );
}
