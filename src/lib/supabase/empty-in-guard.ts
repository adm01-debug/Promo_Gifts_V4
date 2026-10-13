/**
 * empty-in-guard.ts
 *
 * Helper para evitar `.in(column, [])` com array vazio em queries diretas ao
 * client Supabase (`supabase.from(...)`).
 *
 * PostgREST aceita `col=in.()` e responde com 0 linhas, mas:
 *   1. A chamada de rede é desperdiçada (round-trip inteiro só para um
 *      resultado que já sabemos ser vazio).
 *   2. Em volumes de tráfego altos (ex. dev/E2E batendo em produção — ver
 *      incidente 2026-10-13), esses round-trips vazios somam carga real na
 *      API sem nenhum benefício.
 *   3. `dbInvoke` (src/lib/db/postgrest.ts) já faz esse short-circuit para
 *      quem usa o helper central — isto cobre os call sites que usam
 *      `supabase.from()` direto, fora do dbInvoke.
 *
 * Uso:
 *   const ids = rows.map((r) => r.id);
 *   if (!hasIds(ids)) return [];
 *   const { data } = await supabase.from('t').select('*').in('id', ids);
 */
export function hasIds<T>(ids: readonly T[] | null | undefined): ids is readonly T[] {
  return Array.isArray(ids) && ids.length > 0;
}
