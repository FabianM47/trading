import type { NewsArticleRaw, NewsProviderType } from '@/types/news';

/**
 * Interface fuer alle News Provider.
 * Jeder Provider holt Artikel von einer bestimmten Quelle.
 */
export interface NewsProvider {
  readonly name: string;
  readonly type: NewsProviderType;
  fetch(config: Record<string, unknown>): Promise<NewsArticleRaw[]>;
}

/**
 * Registry fuer alle verfuegbaren News Provider.
 * Provider werden beim Import automatisch registriert.
 */
const providerRegistry = new Map<NewsProviderType, NewsProvider>();

export function registerProvider(provider: NewsProvider): void {
  providerRegistry.set(provider.type, provider);
}

export function getProvider(type: NewsProviderType): NewsProvider | undefined {
  return providerRegistry.get(type);
}

export function getAllProviders(): NewsProvider[] {
  return Array.from(providerRegistry.values());
}
