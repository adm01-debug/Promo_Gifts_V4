/**
 * Leitura dos produtos ativos para o relatório "Produtos sem dados de frete".
 *
 * O `select` usa `FREIGHT_READINESS_SELECT` (colunas de `PRODUCT_MEASURE_COLUMNS` mais
 * `supplier_id`) como literal, que o cliente tipado precisa para inferir o resultado;
 * o teste do serviço trava a igualdade com a constante do motor e o que é enviado.
 *
 * PostgREST limita as linhas por pedido (1.000 por padrão), então a leitura é em
 * páginas ordenadas por `id` (chave estável: sem repetir nem pular linha entre
 * páginas). Medido em produção em 2026-11-20: 7.951 produtos ativos, 25,8 ms de
 * execução no banco — o filtro "sem dados" roda no navegador, sem RPC.
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

const PAGE_SIZE = 1000;

export class FreightReadinessError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'FreightReadinessError';
  }
}

export const FREIGHT_READINESS_SELECT =
  'id, name, sku, height_cm, width_cm, length_cm, diameter_cm, weight_g, supplier_id';

async function fetchPage(from: number) {
  const { data, error } = await supabase
    .from('products')
    .select(FREIGHT_READINESS_SELECT)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('id')
    .range(from, from + PAGE_SIZE - 1);
  if (error) {
    logger.error('[freightReadinessService] falha ao listar produtos', {
      code: error.code,
      message: error.message,
    });
    throw new FreightReadinessError('Não foi possível carregar os produtos.', error);
  }
  return data;
}

export type FreightReadinessProduct = Awaited<ReturnType<typeof fetchPage>>[number];

export async function fetchActiveProductsForFreight(): Promise<FreightReadinessProduct[]> {
  const all: FreightReadinessProduct[] = [];
  // Para só em página vazia e avança pelo que veio: se o "Max rows" do projeto for
  // menor que 1.000, a página curta não pode ser tomada como a última.
  for (let from = 0; ;) {
    const page = await fetchPage(from);
    if (page.length === 0) return all;
    all.push(...page);
    from += page.length;
  }
}

/** Nome dos fornecedores, para a coluna e o filtro do relatório. */
export async function fetchSupplierNames(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from('suppliers').select('id, name').order('name');
  if (error) {
    logger.error('[freightReadinessService] falha ao listar fornecedores', {
      code: error.code,
      message: error.message,
    });
    throw new FreightReadinessError('Não foi possível carregar os fornecedores.', error);
  }
  return new Map(data.map((s) => [s.id, s.name]));
}
