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
  /** Prefixo de toda consulta de medidas: invalidar este valor atualiza todas as listas de ids. */
  productMeasuresAll: ['product-measures'] as const,
  /** Ids ordenados e sem duplicata: a mesma lista em outra ordem reaproveita o cache. */
  productMeasures: (ids: readonly string[]) =>
    [...FREIGHT_QUERY_KEYS.productMeasuresAll, ids] as const,
};

/** Caixas e parâmetros mudam raramente: 10 minutos sem refazer a consulta. */
export const FREIGHT_STALE_TIME_MS = 10 * 60 * 1000;

/** Medidas de produto mudam um pouco mais (cadastro): 5 minutos. */
export const PRODUCT_MEASURES_STALE_TIME_MS = 5 * 60 * 1000;
