import type { SortOption } from '@/components/kit-library/KitLibraryFilters';

export function getItemsCount(items: unknown): number | null {
  if (!Array.isArray(items)) return null;
  let total = 0;
  for (const item of items) {
    if (
      !item ||
      typeof item !== 'object' ||
      Array.isArray(item) ||
      !('quantity' in item) ||
      typeof item.quantity !== 'number' ||
      !Number.isFinite(item.quantity)
    )
      return null;
    total += item.quantity;
  }
  return total;
}

export function applySort<
  T extends {
    name: string | null;
    total_price: number | null;
    updated_at?: string | null;
    usage_count?: number;
    last_used_at?: string | null;
  },
>(list: T[], sort: SortOption): T[] {
  const arr = [...list];
  switch (sort) {
    case 'price-desc':
      arr.sort((a, b) =>
        a.total_price === null
          ? b.total_price === null
            ? 0
            : 1
          : b.total_price === null
            ? -1
            : b.total_price - a.total_price,
      );
      break;
    case 'name-asc':
      arr.sort((a, b) =>
        a.name === null
          ? b.name === null
            ? 0
            : 1
          : b.name === null
            ? -1
            : a.name.localeCompare(b.name, 'pt-BR'),
      );
      break;
    case 'usage-desc':
      arr.sort((a, b) => (b.usage_count ?? 0) - (a.usage_count ?? 0));
      break;
    case 'last-used':
      arr.sort((a, b) => (b.last_used_at || '').localeCompare(a.last_used_at || ''));
      break;
    case 'recent':
    default:
      arr.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
  }
  return arr;
}
