/**
 * useFavoriteTemplate — persiste "template favorito" do usuário em localStorage.
 *
 * SSR-safe (checa `typeof window`). Corrompimento no storage retorna null.
 * Só aceita ids que passem pelo validador do consumidor — este hook não conhece
 * o registry (evita ciclos), apenas armazena o valor bruto.
 */

import { useCallback, useEffect, useState } from 'react';

const STORAGE_PREFIX = 'magazine:favorite-template:v2';

function storageKey(userId: string | null | undefined): string {
  return `${STORAGE_PREFIX}:${encodeURIComponent(userId || 'anonymous')}`;
}

function readStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem(key);
    if (typeof v !== 'string' || v.length === 0 || v.length > 100) return null;
    return v;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // storage indisponível (Safari privado, cota estourada) → ignora silenciosamente
  }
}

export function useFavoriteTemplate(userId?: string | null) {
  const key = storageKey(userId);
  const [favoriteId, setFavoriteId] = useState<string | null>(() => readStorage(key));

  useEffect(() => {
    setFavoriteId(readStorage(key));
  }, [key]);

  // Sincroniza entre abas/janelas
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      setFavoriteId(readStorage(key));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);

  const toggleFavorite = useCallback(
    (id: string) => {
      setFavoriteId((current) => {
        const next = current === id ? null : id;
        writeStorage(key, next);
        return next;
      });
    },
    [key],
  );

  const clearFavorite = useCallback(() => {
    writeStorage(key, null);
    setFavoriteId(null);
  }, [key]);

  return { favoriteId, toggleFavorite, clearFavorite };
}
