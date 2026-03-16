'use client';

import { useMemo } from 'react';

// URL-Regex für klickbare Links
const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/g;
// @mention Regex
const MENTION_REGEX = /@(\w+)/g;

function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
    return null;
  } catch {
    return null;
  }
}

interface MessageContentProps {
  content: string;
  isMine: boolean;
}

export default function MessageContent({ content, isMine }: MessageContentProps) {
  const parts = useMemo(() => {
    const tokens: { start: number; end: number; type: 'url' | 'mention'; value: string }[] = [];

    let match: RegExpExecArray | null;

    URL_REGEX.lastIndex = 0;
    while ((match = URL_REGEX.exec(content)) !== null) {
      tokens.push({ start: match.index, end: match.index + match[0].length, type: 'url', value: match[0] });
    }

    MENTION_REGEX.lastIndex = 0;
    while ((match = MENTION_REGEX.exec(content)) !== null) {
      const inUrl = tokens.some(t => t.type === 'url' && match!.index >= t.start && match!.index < t.end);
      if (!inUrl) {
        tokens.push({ start: match.index, end: match.index + match[0].length, type: 'mention', value: match[0] });
      }
    }

    tokens.sort((a, b) => a.start - b.start);

    const result: { type: 'text' | 'url' | 'mention'; value: string }[] = [];
    let cursor = 0;

    for (const token of tokens) {
      if (token.start > cursor) {
        result.push({ type: 'text', value: content.slice(cursor, token.start) });
      }
      result.push({ type: token.type, value: token.value });
      cursor = token.end;
    }

    if (cursor < content.length) {
      result.push({ type: 'text', value: content.slice(cursor) });
    }

    return result.length > 0 ? result : [{ type: 'text' as const, value: content }];
  }, [content]);

  return (
    <p className="text-sm whitespace-pre-wrap break-words">
      {parts.map((part, i) => {
        if (part.type === 'url') {
          const safeUrl = sanitizeUrl(part.value);
          if (safeUrl) {
            return (
              <a
                key={i}
                href={safeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`underline break-all ${isMine ? 'text-blue-700 hover:text-blue-900' : 'text-blue-400 hover:text-blue-300'}`}
              >
                {part.value}
              </a>
            );
          }
          return <span key={i}>{part.value}</span>;
        }
        if (part.type === 'mention') {
          return (
            <span
              key={i}
              className={`font-semibold ${isMine ? 'text-blue-700' : 'text-blue-400'}`}
            >
              {part.value}
            </span>
          );
        }
        return <span key={i}>{part.value}</span>;
      })}
    </p>
  );
}
