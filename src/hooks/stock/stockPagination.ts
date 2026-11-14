/**
 * stockPagination — busca paginada por keyset (sequencial ou em faixas UUID
 * paralelas). Extraído de stockFetcher.ts (reexportado lá) para manter o
 * arquivo dentro da baseline de tamanho.
 */
import { untypedFrom } from '@/lib/supabase-untyped';
import { GOLD_READ_ALIASES } from '@/integrations/supabase/gold-relations';
import { logger } from '@/lib/logger';

// ============================================
// BUSCA PAGINADA
// ============================================

/**
 * Colunas permitidas como filtros por tabela lógica (pré-GOLD_READ_ALIASES).
 * Defesa em profundidade: impede que colunas arbitrárias sejam injetadas via
 * parâmetro `filters` de fetchPaginatedFromBridge. Tabelas ausentes → sem restrição.
 */
// Inclui apenas tabelas chamadas com filtros em produção. Tabelas ausentes
// (categories, suppliers, product_images, mv_stock_velocity) não recebem
// filtros e portanto não precisam de restrição.
export const ALLOWED_FILTER_KEYS: Readonly<Record<string, ReadonlySet<string>>> = {
  products: new Set(['active', 'is_active', 'supplier_id', 'category_id', 'brand']),
  product_variants: new Set(['is_active', 'product_id', 'color_id', 'supplier_id']),
  variant_supplier_sources: new Set(['is_active', 'variant_id', 'supplier_id']),
};

/**
 * Nº de faixas paralelas de keyset para tabelas grandes com PK UUID (ver
 * `partitions` em fetchPaginatedFromBridge). Coluna de keyset confirmada como
 * `uuid` em produção para products(v_products_public), product_variants,
 * variant_supplier_sources, product_images e mv_stock_velocity.
 */
export const UUID_KEYSET_PARTITIONS = 8;

/**
 * Limites [lo, hi) contíguos que cobrem o espaço inteiro de UUID em `n` faixas,
 * pelos 2 primeiros dígitos hex. A ordem do tipo `uuid` no Postgres é a ordem
 * byte a byte = ordem lexicográfica do texto hex minúsculo, então concatenar as
 * faixas em ordem crescente reproduz exatamente `ORDER BY id` da tabela toda.
 * Primeira faixa sem `lo` e última sem `hi` (cobertura total por construção).
 */
export function uuidKeysetRanges(n: number): Array<[string | null, string | null]> {
  const parts = Math.max(1, Math.min(256, Math.floor(n)));
  const bound = (i: number) =>
    `${Math.floor((i * 256) / parts)
      .toString(16)
      .padStart(2, '0')}000000-0000-0000-0000-000000000000`;
  return Array.from({ length: parts }, (_, i) => [
    i === 0 ? null : bound(i),
    i === parts - 1 ? null : bound(i + 1),
  ]);
}

/**
 * Busca paginada por keyset (`id`) via PostgREST direto (ponte descontinuada), com deduplicação.
 *
 * A constraint `T extends { id: string | number }` reflete o fato de que:
 *  - Tabelas com UUID PK (products, product_variants, variant_supplier_sources…) → id: string
 *  - Tabelas com bigint PK (stock_snapshots.id = int8) → PostgREST retorna como JS number
 * Ambos os tipos são aceitos. Callers com { id: string } satisfazem a constraint
 * porque string é subtipo de string | number (TypeScript structural typing).
 */
export async function fetchPaginatedFromBridge<T extends { id: number | string }>(
  table: string,
  select: string,
  pageSize = 1000,
  maxRecords = 100000,
  filters?: Record<string, unknown>,
  keysetColumn = 'id',
  // >1 SÓ quando `keysetColumn` é `uuid`: divide o keyset em faixas buscadas em
  // paralelo (cada uma paginada por keyset) e concatena em ordem crescente —
  // mesma saída e mesma ordem do modo sequencial, sem a cadeia de round-trips.
  partitions = 1,
): Promise<T[]> {
  // PostgREST nativo (Caminho B). A `external-db-bridge` foi descontinuada (410 Gone).
  //
  // BUG-STOCK-04 FIX — Paginação por KEYSET (cursor em `id`), não offset/range.
  // Raiz da contagem de variações inflada no dashboard (ex.: 22.620 vs ~18.4k):
  // o PostgREST NÃO garante ordem estável entre requisições HTTP separadas.
  // Com `.range()` e sem `.order()`, durante uma janela de escrita (sync de
  // fornecedor XBZ/SPOT em product_variants) as páginas se sobrepõem → linhas
  // duplicadas/saltadas → totais errados. Keyset (`order(id)` + `id > lastId`)
  // é imune a reordenação de linhas existentes e a inserts concorrentes; o
  // Set `seen` é cinto-e-suspensório contra qualquer duplicata residual.
  // Aliases centralizados: tabelas Ouro expostas via views públicas (Medallion).
  const aliases: Readonly<Record<string, string>> = GOLD_READ_ALIASES;
  const resolvedTable = aliases[table] ?? table;

  const fetchRange = async (lo: string | null, hi: string | null) => {
    const all: T[] = [];
    // Set<string | number>: aceita UUIDs (string, tabelas Ouro com UUID PK)
    // e bigint PKs (number, ex: stock_snapshots.id=int8 retornado como JS number).
    // SameValueZero garante deduplicação correta para ambos sem mistura de tipos.
    const seen = new Set<number | string>();
    // string | number | null: PostgREST retorna bigint PKs como JS number (não string).
    // Cursor evolution: null → T.id (string|number) → gt() na próxima página.
    let lastId: number | string | null = null;
    let totalCount: number | null = null;
    let goneMessage: string | null = null;

    while (all.length < maxRecords) {
      let query = untypedFrom(resolvedTable).select<string, T>(select);

      if (filters) {
        const allowed = ALLOWED_FILTER_KEYS[table];
        for (const [col, val] of Object.entries(filters)) {
          if (allowed !== undefined && !allowed.has(col)) {
            logger.warn(
              `[Stock] fetchPaginatedFromBridge: coluna de filtro não permitida "${col}" em "${table}" — ignorado`,
            );
            continue;
          }
          if (val === null) query = query.is(col, null);
          else if (Array.isArray(val)) query = query.in(col, val);
          else query = query.eq(col, val);
        }
      }

      // Cursor estável: ordena pela coluna de keyset (PK físico) e busca a próxima
      // página após o último cursor visto. Views Ouro sem coluna `id` física (ex.:
      // mv_stock_velocity, cujo PK é variant_supplier_source_id) passam o nome real
      // via `keysetColumn`; o `select` continua expondo o valor como `id` na saída.
      query = query.order(keysetColumn, { ascending: true }).limit(pageSize);
      if (lastId !== null) query = query.gt(keysetColumn, lastId);
      if (lo !== null) query = query.gte(keysetColumn, lo);
      if (hi !== null) query = query.lt(keysetColumn, hi);

      const { data, error, count } = await query;
      if (error) {
        if (error.message?.includes('410') || error.message?.includes('Gone')) {
          goneMessage = error.message;
          break;
        }
        const errorMsg = `Erro ao buscar ${table}: ${error.message}`;
        logger.error(`[Stock] ${errorMsg}`, error);
        throw new Error(errorMsg);
      }

      const records: T[] = data ?? [];
      if (lastId === null && typeof count === 'number') totalCount = count;
      if (records.length === 0) break;

      for (const r of records) {
        const rid = r?.id;
        if (rid && !seen.has(rid)) {
          seen.add(rid);
          all.push(r);
        }
      }

      // Otimização: se o total já é conhecido e já buscamos tudo, não faz mais
      // um round-trip para confirmar página vazia.
      if (totalCount !== null && all.length >= totalCount) break;

      const nextCursor = records[records.length - 1]?.id ?? null;
      // Segurança: se o cursor não avançou, paramos para não loopar.
      if (nextCursor === null || nextCursor === lastId) {
        logger.warn(`[Stock] ${table}: cursor preso em "${nextCursor}" — interrompendo paginação.`);
        break;
      }
      lastId = nextCursor;

      if (records.length < pageSize) break;
    }
    return { all, totalCount, goneMessage };
  };

  const ranges: Array<[string | null, string | null]> =
    partitions > 1 ? uuidKeysetRanges(partitions) : [[null, null]];
  const results = await Promise.all(ranges.map(([lo, hi]) => fetchRange(lo, hi)));

  // Concatena as faixas em ordem crescente (= ordem global do keyset). Um 410
  // numa faixa encerra a concatenação ali (prefixo, como no modo sequencial).
  // Teto igual ao do modo sequencial: páginas inteiras até alcançar maxRecords.
  const cap = partitions > 1 ? Math.max(0, Math.ceil(maxRecords / pageSize) * pageSize) : Infinity;
  const all: T[] = [];
  const seen = new Set<number | string>();
  let totalCount: number | null = 0;
  let goneMessage: string | null = null;
  for (const r of results) {
    for (const row of r.all) {
      if (all.length >= cap) break;
      if (!seen.has(row.id)) {
        seen.add(row.id);
        all.push(row);
      }
    }
    totalCount = totalCount !== null && r.totalCount !== null ? totalCount + r.totalCount : null;
    if (all.length >= cap) break;
    if (r.goneMessage !== null) {
      goneMessage = r.goneMessage;
      break;
    }
  }

  if (goneMessage !== null) {
    const { reportSilentEmpty } = await import('@/lib/external-db/silent-empty-report');
    reportSilentEmpty({
      reason: 'gone_410',
      table: resolvedTable,
      operation: 'select',
      message: goneMessage,
    });
    logger.warn(`[Stock] Bridge deprecated (410) for ${table} — stopping pagination.`);
  }

  logger.log(`[Stock] ${table}: carregados ${all.length}/${totalCount ?? '?'} registros (keyset)`);
  return all;
}
