'use client';

import { useState, useMemo, useRef, useCallback } from 'react';

interface ChatUser {
  user_id: string;
  username: string;
}

interface UseMentionAutocompleteOptions {
  chatUsers: ChatUser[];
  userId: string;
}

interface UseMentionAutocompleteReturn {
  messageInput: string;
  setMessageInput: React.Dispatch<React.SetStateAction<string>>;
  mentionSuggestions: ChatUser[];
  mentionIndex: number;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent, onSend: () => void) => void;
  insertMention: (username: string) => void;
  resetInput: () => void;
}

export function useMentionAutocomplete({ chatUsers, userId }: UseMentionAutocompleteOptions): UseMentionAutocompleteReturn {
  const [messageInput, setMessageInput] = useState('');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null!);

  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();

    const broadcastEntries: ChatUser[] = [
      { user_id: '__all', username: 'all' },
      { user_id: '__everyone', username: 'everyone' },
      { user_id: '__here', username: 'here' },
    ].filter(b => b.username.startsWith(q));

    const userEntries = chatUsers
      .filter(u => u.username.toLowerCase().startsWith(q) && u.user_id !== userId);

    return [...broadcastEntries, ...userEntries].slice(0, 5);
  }, [mentionQuery, chatUsers, userId]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMessageInput(val);

    // Auto-grow textarea (max 4 Zeilen)
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 96) + 'px';

    // @mention Detection
    const cursorPos = e.target.selectionStart || val.length;
    const textBeforeCursor = val.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionStart(cursorPos - atMatch[0].length);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  }, []);

  const insertMention = useCallback((mentionUsername: string) => {
    setMessageInput(prev => {
      const before = prev.slice(0, mentionStart);
      const matchLength = 1 + (mentionQuery?.length || 0);
      const after = prev.slice(mentionStart + matchLength);
      const afterMention = after.startsWith(' ') ? after : ' ' + after;
      return before + '@' + mentionUsername + afterMention;
    });
    setMentionQuery(null);

    const newCursorPos = mentionStart + 1 + mentionUsername.length + 1;
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    });
  }, [mentionStart, mentionQuery]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, onSend: () => void) => {
    if (mentionSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => (prev + 1) % mentionSuggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length);
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        insertMention(mentionSuggestions[mentionIndex].username);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }, [mentionSuggestions, mentionIndex, insertMention]);

  const resetInput = useCallback(() => {
    setMessageInput('');
    setMentionQuery(null);
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.focus();
    }
  }, []);

  return {
    messageInput, setMessageInput, mentionSuggestions, mentionIndex,
    inputRef, handleInputChange, handleKeyDown, insertMention, resetInput,
  };
}
