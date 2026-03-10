import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import type { MarketBrief, NewsFeedResponse } from '@/types/news';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useMarketBrief(date?: string) {
  const params = date ? `?date=${date}` : '';
  const { data, error, isLoading, mutate } = useSWR<{ brief: MarketBrief | null }>(
    `/api/news/brief${params}`,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 0 }
  );

  return {
    brief: data?.brief || null,
    isLoading,
    error,
    refresh: mutate,
  };
}

export function useNewsFeed(sentimentFilter?: string) {
  const getKey = (pageIndex: number, previousData: NewsFeedResponse | null) => {
    if (previousData && !previousData.hasMore) return null;
    const cursor = previousData?.nextCursor;
    let url = `/api/news/feed?limit=20`;
    if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
    if (sentimentFilter) url += `&sentiment=${sentimentFilter}`;
    return url;
  };

  const { data, error, size, setSize, isLoading, isValidating, mutate } =
    useSWRInfinite<NewsFeedResponse>(getKey, fetcher, {
      revalidateFirstPage: false,
      revalidateOnFocus: false,
    });

  const items = data?.flatMap((page) => page.items) || [];
  const hasMore = data?.[data.length - 1]?.hasMore ?? false;
  const isLoadingMore = isValidating && size > 1;

  return {
    items,
    isLoading: isLoading && size === 1,
    hasMore,
    isLoadingMore,
    loadMore: () => setSize(size + 1),
    refresh: mutate,
    error,
  };
}
