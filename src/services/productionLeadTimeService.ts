/**
 * Leituras do prazo de produção. Converte as linhas do banco nos objetos
 * simples de `src/lib/lead-time` (a biblioteca não conhece linhas cruas).
 *
 * Como as tabelas se ligam (conferido em produção, 2026-11-20):
 * - `products.supplier_id` -> `supplier_settings.supplier_id` (prazo padrão do fornecedor);
 * - `print_area_techniques.tabela_preco_id` -> `tabela_preco_gravacao_oficial.id`
 *   (25267 de 25267 linhas ligam) e `..._faixa.tabela_preco_gravacao_id` aponta para a mesma tabela;
 * - `quote_item_personalizations.technique_id` = `print_area_techniques.id` (2 de 2 linhas).
 */
import { supabase } from '@/integrations/supabase/client';
import type { PriceBandInput, PrintAreaTechniqueInput } from '@/lib/lead-time';

/** Ids por consulta: a lista vai na URL do PostgREST. */
export const LEAD_TIME_BATCH_SIZE = 100;

export interface ProductSupplierLeadTime {
  productId: string;
  /** products.lead_time_days */
  leadTimeDays: number | null;
  /** supplier_settings.default_lead_time_days do fornecedor do produto (null = sem cadastro) */
  supplierDefaultDays: number | null;
}

/** Uma técnica cadastrada, ativa ou não: o `id` é o que o orçamento guarda em `technique_id`. */
export interface TechniqueRegistration {
  /** print_area_techniques.id */
  id: string;
  isActive: boolean;
  technique: PrintAreaTechniqueInput;
}

export interface PersonalizationLeadTimeData {
  registrations: TechniqueRegistration[];
  bands: PriceBandInput[];
}

function batches(ids: readonly string[]): string[][] {
  const out: string[][] = [];
  for (let start = 0; start < ids.length; start += LEAD_TIME_BATCH_SIZE) {
    out.push(ids.slice(start, start + LEAD_TIME_BATCH_SIZE));
  }
  return out;
}

function readError(what: string, cause: unknown): Error {
  return new Error(`Não foi possível ler ${what}.`, { cause });
}

export const productionLeadTimeService = {
  /** Prazo do produto e padrão do fornecedor, um registro por produto encontrado. */
  async listProductSuppliers(productIds: readonly string[]): Promise<ProductSupplierLeadTime[]> {
    const products: Array<{
      id: string;
      lead_time_days: number | null;
      supplier_id: string | null;
    }> = [];
    for (const ids of batches(productIds)) {
      const { data, error } = await supabase
        .from('products')
        .select('id, lead_time_days, supplier_id')
        .in('id', ids);
      if (error) throw readError('o prazo dos produtos', error);
      products.push(...(data ?? []));
    }

    const supplierIds = [
      ...new Set(products.flatMap((p) => (p.supplier_id === null ? [] : [p.supplier_id]))),
    ];
    const defaults = new Map<string, number | null>();
    for (const ids of batches(supplierIds)) {
      const { data, error } = await supabase
        .from('supplier_settings')
        .select('supplier_id, default_lead_time_days')
        .in('supplier_id', ids);
      if (error) throw readError('o prazo padrão dos fornecedores', error);
      for (const row of data ?? []) defaults.set(row.supplier_id, row.default_lead_time_days);
    }

    return products.map((p) => ({
      productId: p.id,
      leadTimeDays: p.lead_time_days,
      supplierDefaultDays: p.supplier_id === null ? null : (defaults.get(p.supplier_id) ?? null),
    }));
  },

  /** Faixas (quantidade, prazo) das tabelas de preço de gravação informadas. */
  async listPriceBands(tableIds: readonly string[]): Promise<PriceBandInput[]> {
    const bands: PriceBandInput[] = [];
    for (const ids of batches(tableIds)) {
      const { data, error } = await supabase
        .from('tabela_preco_gravacao_oficial_faixa')
        .select('tabela_preco_gravacao_id, quantidade_minima, quantidade_maxima, prazo_dias')
        .in('tabela_preco_gravacao_id', ids);
      if (error) throw readError('as faixas da tabela de preço de gravação', error);
      for (const row of data ?? []) {
        bands.push({
          tabelaPrecoId: row.tabela_preco_gravacao_id,
          minQuantity: row.quantidade_minima,
          maxQuantity: row.quantidade_maxima,
          leadTimeDays: row.prazo_dias,
        });
      }
    }
    return bands;
  },

  /** Técnicas cadastradas dos produtos e as faixas das tabelas de preço que elas usam. */
  async getPersonalizationData(
    productIds: readonly string[],
  ): Promise<PersonalizationLeadTimeData> {
    const registrations: TechniqueRegistration[] = [];
    for (const ids of batches(productIds)) {
      const { data, error } = await supabase
        .from('print_area_techniques')
        .select('id, product_id, location_code, tabela_preco_id, production_days, is_active')
        .in('product_id', ids);
      if (error) throw readError('as técnicas de personalização dos produtos', error);
      for (const row of data ?? []) {
        registrations.push({
          id: row.id,
          isActive: row.is_active,
          technique: {
            productId: row.product_id,
            locationCode: row.location_code,
            tabelaPrecoId: row.tabela_preco_id,
            productionDays: row.production_days,
          },
        });
      }
    }

    const bands = await productionLeadTimeService.listPriceBands([
      ...new Set(registrations.map((r) => r.technique.tabelaPrecoId)),
    ]);
    return { registrations, bands };
  },
};
