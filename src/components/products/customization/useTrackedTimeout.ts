import { useCallback, useEffect, useRef } from 'react';

export function useTrackedTimeout() {
  const pendingTimeouts = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(
    () => () => {
      for (const timeoutId of pendingTimeouts.current) clearTimeout(timeoutId);
      pendingTimeouts.current.clear();
    },
    [],
  );

  return useCallback((callback: () => void, delay: number) => {
    const timeoutId = setTimeout(() => {
      pendingTimeouts.current.delete(timeoutId);
      callback();
    }, delay);
    pendingTimeouts.current.add(timeoutId);
    return timeoutId;
  }, []);
}
