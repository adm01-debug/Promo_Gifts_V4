/**
 * Faixas (quantidade e prazo) das tabelas de preço de gravação. A tela de
 * técnicas do produto usa o prazo da faixa como sugestão ("tabela: N").
 * Ids ordenados e sem repetição na chave: a mesma lista em outra ordem reaproveita o cache.
 */
import { useQuery } from '@tanstack/react-query';
import { FREIGHT_QUERY_KEYS, LEAD_TIME_STALE_TIME_MS } from '@/hooks/freight/keys';
import type { PriceBandInput } from '@/lib/lead-time';
import { productionLeadTimeService } from '@/services/productionLeadTimeService';

const NO_BANDS: PriceBandInput[] = [];

export function usePriceTableBands(tableIds: readonly string[]): PriceBandInput[] {
  const ids = [...new Set(tableIds)].sort();
  const query = useQuery({
    queryKey: FREIGHT_QUERY_KEYS.productionLeadTime.priceBands(ids),
    queryFn: () => productionLeadTimeService.listPriceBands(ids),
    staleTime: LEAD_TIME_STALE_TIME_MS,
    enabled: ids.length > 0,
  });
  return query.data ?? NO_BANDS;
}
