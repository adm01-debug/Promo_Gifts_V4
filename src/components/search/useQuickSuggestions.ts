import { useMemo } from 'react';
import { useCategoryIcons, type CategoryIcon } from '@/hooks/products/useCategoryIcons';
import type { QuickSuggestion } from './useGlobalSearch';

const MAX_QUICK_SUGGESTIONS = 6;

/** Atalhos da busca: categorias ativas do catálogo, em ordem alfabética, sem repetição. */
export function buildQuickSuggestions(rows: CategoryIcon[] | undefined): QuickSuggestion[] {
  const names = new Set<string>();
  for (const row of rows ?? []) {
    const name = row.category_name?.trim();
    if (name) names.add(name);
  }
  return [...names]
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
    .slice(0, MAX_QUICK_SUGGESTIONS)
    .map((label) => ({ label, icon: '🏷️' }));
}

export function useQuickSuggestions(): QuickSuggestion[] {
  const { data } = useCategoryIcons();
  return useMemo(() => buildQuickSuggestions(data), [data]);
}
