import { useMemo } from 'react';
import { useCategoryIcons, type CategoryIcon } from '@/hooks/products/useCategoryIcons';

export interface QuickSuggestion {
  label: string;
  icon: string;
}

const MAX_QUICK_SUGGESTIONS = 6;

export function buildQuickSuggestions(rows: CategoryIcon[] | undefined): QuickSuggestion[] {
  const seen = new Map<string, string>(); // category_name -> icon
  for (const row of rows ?? []) {
    const name = row.category_name?.trim();
    if (name && !seen.has(name)) seen.set(name, row.icon ?? "🏷️");
  }
  return [...seen.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
    .slice(0, MAX_QUICK_SUGGESTIONS)
    .map(([label, icon]) => ({ label, icon }));
}

export function useQuickSuggestions(): QuickSuggestion[] {
  const { data } = useCategoryIcons();
  return useMemo(() => buildQuickSuggestions(data), [data]);
}
