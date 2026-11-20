/**
 * `useProductMeasures` — medidas e peso dos produtos que o motor de frete lê.
 *
 * Lê só as colunas de `PRODUCT_MEASURE_SELECT` em lotes de 100 ids (a lista vai
 * na URL do PostgREST; um orçamento grande estouraria o limite). A chave de
 * cache usa os ids ordenados e sem repetição, então a mesma lista em outra
 * ordem reaproveita a consulta.
 */
import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FREIGHT_QUERY_KEYS, PRODUCT_MEASURES_STALE_TIME_MS } from '@/hooks/freight/keys';
import { PRODUCT_MEASURE_SELECT, type ProductMeasureRow } from '@/lib/freight';

/** Ids por consulta. */
export const PRODUCT_MEASURES_BATCH_SIZE = 100;

const NO_MEASURES: ReadonlyMap<string, ProductMeasureRow> = new Map();

export interface UseProductMeasuresResult {
  /** Linha de cada produto encontrado, por id. Produto ausente do mapa não existe ou não está visível. */
  measures: ReadonlyMap<string, ProductMeasureRow>;
  /** `true` quando já há leitura em cache (mesmo que um refetch de fundo tenha falhado). */
  hasData: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

function uniqueSorted(ids: readonly string[]): string[] {
  return [...new Set(ids)].sort();
}

async function fetchBatch(ids: string[]): Promise<ProductMeasureRow[]> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_MEASURE_SELECT)
    .in('id', ids)
    .overrideTypes<ProductMeasureRow[], { merge: false }>();
  if (error) throw new Error('Não foi possível ler as medidas dos produtos.', { cause: error });
  return data ?? [];
}

async function fetchMeasures(ids: readonly string[]): Promise<ProductMeasureRow[]> {
  const batches: string[][] = [];
  for (let start = 0; start < ids.length; start += PRODUCT_MEASURES_BATCH_SIZE) {
    batches.push(ids.slice(start, start + PRODUCT_MEASURES_BATCH_SIZE));
  }
  const results = await Promise.all(batches.map(fetchBatch));
  return results.flat();
}

export function useProductMeasures(productIds: readonly string[]): UseProductMeasuresResult {
  const ids = useMemo(() => uniqueSorted(productIds), [productIds]);

  const query = useQuery({
    queryKey: FREIGHT_QUERY_KEYS.productMeasures(ids),
    queryFn: () => fetchMeasures(ids),
    enabled: ids.length > 0,
    staleTime: PRODUCT_MEASURES_STALE_TIME_MS,
    // Remover um produto do orçamento troca a chave: mostra as medidas anteriores até a nova leitura.
    placeholderData: keepPreviousData,
  });

  // A consulta devolve array: o React Query mantém a mesma referência quando o
  // conteúdo não mudou, e o Map só é refeito quando muda de fato.
  const rows = query.data;
  const measures = useMemo(
    () => (rows ? new Map(rows.map((row) => [row.id, row])) : NO_MEASURES),
    [rows],
  );

  // Com medidas anteriores na tela, só conta como "carregando" se faltar alguma das pedidas
  // (produto novo no orçamento); remover um produto não pode piscar o esqueleto.
  const waitingForNewIds = query.isPlaceholderData && ids.some((id) => !measures.has(id));

  return {
    measures,
    hasData: rows !== undefined,
    isLoading: query.isLoading || waitingForNewIds,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
