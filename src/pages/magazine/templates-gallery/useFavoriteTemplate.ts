/** Favoritos de templates por conta, com leitura do formato legado de favorito único. */

import { useCallback, useEffect, useState } from 'react';

const STORAGE_PREFIX = 'magazine:favorite-template:v3';
const LEGACY_PREFIX = 'magazine:favorite-template:v2';
const MAX_FAVORITES = 24;

function storageKey(prefix: string, userId: string | null | undefined): string {
  return `${prefix}:${encodeURIComponent(userId || 'anonymous')}`;
}

function isValidId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 100;
}

function readStorage(key: string, legacyKey: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem(key);
    if (stored !== null) {
      const parsed: unknown = JSON.parse(stored);
      if (!Array.isArray(parsed) || parsed.length > MAX_FAVORITES || !parsed.every(isValidId)) {
        return [];
      }
      return [...new Set(parsed)];
    }
    const legacy = window.localStorage.getItem(legacyKey);
    return isValidId(legacy) ? [legacy] : [];
  } catch {
    return [];
  }
}

function writeStorage(key: string, values: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    // Persistir [] impede que um favorito legado reapareça após "limpar".
    window.localStorage.setItem(key, JSON.stringify(values));
  } catch {
    // A UI continua utilizável se o storage estiver indisponível.
  }
}

export function useFavoriteTemplate(userId?: string | null) {
  const key = storageKey(STORAGE_PREFIX, userId);
  const legacyKey = storageKey(LEGACY_PREFIX, userId);
  const [stored, setStored] = useState(() => ({ key, ids: readStorage(key, legacyKey) }));
  const favoriteIds = stored.key === key ? stored.ids : readStorage(key, legacyKey);

  useEffect(() => {
    setStored({ key, ids: readStorage(key, legacyKey) });
  }, [key, legacyKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key && event.key !== legacyKey) return;
      setStored({ key, ids: readStorage(key, legacyKey) });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key, legacyKey]);

  const toggleFavorite = useCallback(
    (id: string) => {
      if (!isValidId(id)) return;
      setStored((current) => {
        const ids = current.key === key ? current.ids : readStorage(key, legacyKey);
        const next = ids.includes(id)
          ? ids.filter((favorite) => favorite !== id)
          : ids.length < MAX_FAVORITES
            ? [...ids, id]
            : ids;
        writeStorage(key, next);
        return { key, ids: next };
      });
    },
    [key, legacyKey],
  );

  const clearFavorite = useCallback(() => {
    writeStorage(key, []);
    setStored({ key, ids: [] });
  }, [key]);

  return { favoriteIds, toggleFavorite, clearFavorite };
}
