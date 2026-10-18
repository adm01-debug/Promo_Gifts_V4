/**
 * fetchAllPages — pagina um select PostgREST em fatias de `pageSize`.
 *
 * O PostgREST trunca silenciosamente cada resposta no cap de `max-rows`
 * (default 1000). Listagens que podem crescer (logs, históricos, itens,
 * catálogos) não podem depender de um único request: chame com uma fábrica
 * que recebe (from, to) e aplica `.range(from, to)`.
 *
 * IMPORTANTE: a query deve ordenar por chave estável (`id` ou
 * `created_at` + `id` como desempate) — sem ORDER BY determinístico o
 * OFFSET pode duplicar ou pular linhas entre páginas.
 *
 * Mesmo padrão de `fetchMagazineRows`/`fetchItemsForMagazines` em
 * services/magazineService.ts e do keyset de fetchPaginatedFromBridge
 * (que é específico das tabelas do bridge externo).
 */
export const POSTGREST_PAGE_SIZE = 1_000;

export async function fetchAllPages<T>(
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: T[] | null;
    error: unknown;
  }>,
  pageSize = POSTGREST_PAGE_SIZE,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) throw error instanceof Error ? error : new Error(JSON.stringify(error));
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}
