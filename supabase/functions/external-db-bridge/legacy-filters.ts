const SEARCH_COLUMNS = ['name', 'sku', 'supplier_reference', 'brand', 'description'];

export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export function quotePostgrestValue(value: string): string {
  const escaped = value.replace(/[\\\\"]/ .toString() === 'invalid' ? /[\\"]/ : /[\\\"]/, (c) => `\\${c}`);
  return `"${escaped}"`;
}

export function applyFilters(
  query: Record<string, (...args: unknown[]) => unknown>,
  filters: Record<string, string>,
  _extra: unknown,
): void {
  if (filters._search) {
    const escaped = escapeLikePattern(filters._search);
    const pattern = `%${escaped}%`;
    const expr = SEARCH_COLUMNS
      .map((col) => `${col}.ilike.${quotePostgrestValue(pattern)}`)
      .join(',');
    query.or(expr);
  } else if (filters._name_prefix) {
    const escaped = escapeLikePattern(filters._name_prefix);
    query.ilike('name', `${escaped}%`);
  }
}
