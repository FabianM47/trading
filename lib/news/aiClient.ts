/**
 * AI Client mit Provider-Waterfall (Groq → Mistral)
 *
 * Versucht Groq (Llama 3.3 70B) zuerst, faellt bei Rate-Limit oder Fehler
 * automatisch auf Mistral (Mistral Small) zurueck.
 * Beide nutzen OpenAI-kompatibles Chat-Completions-Format.
 */

import Groq from 'groq-sdk';
import { Mistral } from '@mistralai/mistralai';
import { logError, logInfo } from '@/lib/logger';

// ==========================================
// Types
// ==========================================

export interface AiChatOptions {
  systemPrompt: string;
  userMessage: string;
  jsonMode?: boolean;
  maxTokens?: number;
}

export interface AiChatResult {
  text: string;
  provider: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
}

// ==========================================
// Provider Config
// ==========================================

interface ProviderConfig {
  name: string;
  model: string;
  envKey: string;
}

const PROVIDERS: ProviderConfig[] = [
  { name: 'groq', model: 'llama-3.3-70b-versatile', envKey: 'GROQ_API_KEY' },
  { name: 'mistral', model: 'mistral-small-latest', envKey: 'MISTRAL_API_KEY' },
];

// ==========================================
// Singleton Clients
// ==========================================

let groqClient: Groq | null = null;
let mistralClient: Mistral | null = null;

function getGroqClient(): Groq | null {
  if (groqClient) return groqClient;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  groqClient = new Groq({ apiKey });
  return groqClient;
}

function getMistralClient(): Mistral | null {
  if (mistralClient) return mistralClient;
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) return null;
  mistralClient = new Mistral({ apiKey });
  return mistralClient;
}

// ==========================================
// Provider-spezifische Call-Funktionen
// ==========================================

async function callGroq(options: AiChatOptions, config: ProviderConfig): Promise<AiChatResult> {
  const client = getGroqClient();
  if (!client) throw new Error('GROQ_API_KEY not configured');

  const completion = await client.chat.completions.create({
    model: config.model,
    messages: [
      { role: 'system', content: options.systemPrompt },
      { role: 'user', content: options.userMessage },
    ],
    ...(options.jsonMode && { response_format: { type: 'json_object' } }),
    max_tokens: options.maxTokens || 4096,
  });

  const text = completion.choices[0]?.message?.content || '';

  return {
    text,
    provider: config.name,
    model: config.model,
    promptTokens: completion.usage?.prompt_tokens,
    completionTokens: completion.usage?.completion_tokens,
  };
}

async function callMistral(options: AiChatOptions, config: ProviderConfig): Promise<AiChatResult> {
  const client = getMistralClient();
  if (!client) throw new Error('MISTRAL_API_KEY not configured');

  const completion = await client.chat.complete({
    model: config.model,
    messages: [
      { role: 'system', content: options.systemPrompt },
      { role: 'user', content: options.userMessage },
    ],
    ...(options.jsonMode && { responseFormat: { type: 'json_object' } }),
    maxTokens: options.maxTokens || 4096,
  });

  const text = completion.choices?.[0]?.message?.content || '';
  const textStr = typeof text === 'string' ? text : JSON.stringify(text);

  return {
    text: textStr,
    provider: config.name,
    model: config.model,
    promptTokens: completion.usage?.promptTokens,
    completionTokens: completion.usage?.completionTokens,
  };
}

// ==========================================
// Waterfall-Logik
// ==========================================

function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('429') || msg.includes('rate limit') || msg.includes('quota');
  }
  return false;
}

async function callProvider(
  provider: ProviderConfig,
  options: AiChatOptions
): Promise<AiChatResult> {
  switch (provider.name) {
    case 'groq':
      return callGroq(options, provider);
    case 'mistral':
      return callMistral(options, provider);
    default:
      throw new Error(`Unknown provider: ${provider.name}`);
  }
}

/**
 * Fuehrt einen AI Chat-Call mit automatischem Provider-Fallback aus.
 * Versucht Groq → Mistral bei Rate-Limit oder Fehler.
 */
export async function aiChat(options: AiChatOptions): Promise<AiChatResult> {
  const availableProviders = PROVIDERS.filter((p) => process.env[p.envKey]);

  if (availableProviders.length === 0) {
    throw new Error(
      'Kein AI-Provider konfiguriert. Setze GROQ_API_KEY oder MISTRAL_API_KEY.'
    );
  }

  let lastError: Error | null = null;

  for (const provider of availableProviders) {
    try {
      const result = await callProvider(provider, options);
      logInfo(`AI call successful via ${provider.name} (${provider.model})`);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (isRateLimitError(error)) {
        logInfo(`${provider.name} rate-limited, trying next provider...`);
        continue;
      }

      // Bei sonstigen Fehlern: 1x Retry nach 2s
      try {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const result = await callProvider(provider, options);
        logInfo(`AI call successful via ${provider.name} (retry)`);
        return result;
      } catch (retryError) {
        lastError = retryError instanceof Error ? retryError : new Error(String(retryError));
        logError(`${provider.name} failed after retry`, retryError);
        continue;
      }
    }
  }

  throw lastError || new Error('All AI providers failed');
}
