/**
 * Query keys do domínio de frete (caixas de transporte e parâmetros).
 *
 * Toda chave de caixa começa por `shippingBoxes.all`, então invalidar esse
 * prefixo atualiza a lista do motor, a tabela do cadastro e a lixeira de uma vez.
 */
export const FREIGHT_QUERY_KEYS = {
  shippingBoxes: {
    all: ['shipping-boxes'] as const,
    list: (includeInactive: boolean) =>
      [...FREIGHT_QUERY_KEYS.shippingBoxes.all, { includeInactive }] as const,
    deleted: () => [...FREIGHT_QUERY_KEYS.shippingBoxes.all, 'deleted'] as const,
  },
  settings: ['freight-settings'] as const,
  /** Feriados: a lista por ano da tela e a lista inteira do cálculo do prazo saem do mesmo prefixo. */
  businessCalendar: {
    all: ['business-calendar'] as const,
    year: (year: number) => [...FREIGHT_QUERY_KEYS.businessCalendar.all, 'year', year] as const,
    holidays: () => [...FREIGHT_QUERY_KEYS.businessCalendar.all, 'holidays'] as const,
  },
  /** Prazo de produção: ids de produto ordenados e sem duplicata. */
  productionLeadTime: {
    all: ['production-lead-time'] as const,
    suppliers: (productIds: readonly string[]) =>
      [...FREIGHT_QUERY_KEYS.productionLeadTime.all, 'suppliers', productIds] as const,
    priceBands: (tableIds: readonly string[]) =>
      [...FREIGHT_QUERY_KEYS.productionLeadTime.all, 'price-bands', tableIds] as const,
    personalization: (productIds: readonly string[]) =>
      [...FREIGHT_QUERY_KEYS.productionLeadTime.all, 'personalization', productIds] as const,
  },
  /** Ids ordenados e sem duplicata: a mesma lista em outra ordem reaproveita o cache. */
  productMeasures: (ids: readonly string[]) => ['product-measures', ids] as const,
};

/** Caixas e parâmetros mudam raramente: 10 minutos sem refazer a consulta. */
export const FREIGHT_STALE_TIME_MS = 10 * 60 * 1000;

/** Medidas de produto mudam um pouco mais (cadastro): 5 minutos. */
export const PRODUCT_MEASURES_STALE_TIME_MS = 5 * 60 * 1000;

/** Feriados e prazos de personalização quase não mudam: 24 horas. */
export const LEAD_TIME_STALE_TIME_MS = 24 * 60 * 60 * 1000;

/** Padrão de prazo do fornecedor: 1 hora. */
export const SUPPLIER_LEAD_TIME_STALE_TIME_MS = 60 * 60 * 1000;
