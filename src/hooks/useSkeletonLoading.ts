import { useEffect, useState } from 'react';

export function useSkeletonLoading(delayMs = 650) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [delayMs]);

  return isLoading;
}
