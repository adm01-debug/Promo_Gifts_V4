/**
 * usePublicoAlvoOptions - opcoes de Publico-Alvo (Super Filtro)
 *
 * Le os valores de publico-alvo do SSOT `v_super_filtro_options`
 * (filtro_tipo = 'target_audience'), retornando os slugs canonicos
 * (corporativo, feminino, esportivo, infantil, unissex, masculino) na
 * ordem de exibicao. Esses slugs sao exatamente os valores armazenados em
 * products.target_audience e casados pela RPC fn_super_filtro_product_ids (_publico).
 *
 * Antes, as opcoes vinham de products.tags.publicoAlvo, que o catalogo
 * lightweight nunca hidrata -> a secao ficava eternamente vazia.
 */
import { dbInvoke } from '@/lib/db/postgrest';
import { useQuery } from '@tanstack/react-query';
import { logger } from '@/lib/logger';

interface SuperFiltroOptionRow {
  slug_ou_codigo: string | null;
  ordem: number | null;
}

// Cache compartilhado entre todos os FilterPanel: a lista (6 slugs) muda raramente e
// v_super_filtro_options custa ~4,5 s por chamada (pg_stat_statements, 2026-11-14).
export function usePublicoAlvoOptions(): string[] {
  const { data = [] } = useQuery({
    queryKey: ['super-filtro-options', 'target_audience'],
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    queryFn: async () => {
      try {
        const res = await dbInvoke<SuperFiltroOptionRow>({
          table: 'v_super_filtro_options',
          operation: 'select',
          select: 'slug_ou_codigo, ordem',
          filters: { filtro_tipo: 'target_audience' },
          orderBy: { column: 'ordem', ascending: true },
          limit: 100,
          offset: 0,
        });
        return (res.records || [])
          .map((r) => r.slug_ou_codigo)
          .filter((v): v is string => typeof v === 'string' && v.length > 0);
      } catch (err) {
        logger.error('[usePublicoAlvoOptions] erro ao carregar opcoes:', err);
        // Relanca para nao cachear [] por 30 min; o hook devolve [] (data default).
        throw err;
      }
    },
  });

  return data;
}
