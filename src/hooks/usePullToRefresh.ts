import { useCallback, useState } from 'react';

type RefreshOptions = {
  delayMs?: number;
  onRefresh?: () => Promise<void> | void;
};

export function usePullToRefresh({ delayMs = 700, onRefresh }: RefreshOptions = {}) {
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await Promise.all([
        onRefresh?.(),
        new Promise((resolve) => {
          setTimeout(resolve, delayMs);
        }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [delayMs, onRefresh]);

  return { refreshing, refresh };
}
