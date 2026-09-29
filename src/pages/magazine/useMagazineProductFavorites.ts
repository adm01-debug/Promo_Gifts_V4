import { useCallback, useEffect, useState } from 'react';

const PREFIX = 'magazine:product-favorites:v1';
const MAX_FAVORITES = 500;

function key(userId: string): string {
  return `${PREFIX}:${encodeURIComponent(userId)}`;
}

function read(userId: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const value = JSON.parse(window.localStorage.getItem(key(userId)) ?? '[]');
    if (!Array.isArray(value)) return new Set();
    return new Set(
      value
        .filter((id): id is string => typeof id === 'string' && id.length <= 100)
        .slice(0, MAX_FAVORITES),
    );
  } catch {
    return new Set();
  }
}

function write(userId: string, ids: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key(userId), JSON.stringify([...ids].slice(0, MAX_FAVORITES)));
  } catch {
    // Favoritos são conveniência local; falha de storage não bloqueia a edição.
  }
}

export function useMagazineProductFavorites(userId: string) {
  const [favorites, setFavorites] = useState<Set<string>>(() => read(userId));

  useEffect(() => setFavorites(read(userId)), [userId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (event: StorageEvent) => {
      if (event.key === key(userId)) setFavorites(read(userId));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [userId]);

  const toggleFavorite = useCallback(
    (productId: string) => {
      setFavorites((current) => {
        const next = new Set(current);
        if (next.has(productId)) next.delete(productId);
        else if (next.size < MAX_FAVORITES) next.add(productId);
        write(userId, next);
        return next;
      });
    },
    [userId],
  );

  return { favorites, toggleFavorite };
}
