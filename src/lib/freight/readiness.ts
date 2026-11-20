/**
 * Diz se um produto já tem os dados de frete que o motor exige — sem rodar o
 * empacotamento. É a mesma regra de `resolveItemDimensions` (peso e três lados,
 * ou altura + diâmetro), só que devolvida no formato que o cadastro precisa
 * para apontar o que falta: o relatório "Produtos sem dados de frete" e o
 * indicador da lista de produtos do admin.
 */
import type { ProductDimensionRow } from './columns';
import { resolveItemDimensions } from './resolveItemDimensions';
import type { MeasureSource, MissingMeasure } from './types';

export interface FreightReadiness {
  /** `true` quando o motor consegue empacotar o produto. */
  ready: boolean;
  /** Campos que faltam no cadastro; vazio quando `ready`. */
  missing: MissingMeasure[];
  /** De onde saíram as medidas; `null` quando o produto não está pronto. */
  source: MeasureSource | null;
}

export function getFreightReadiness(row: ProductDimensionRow): FreightReadiness {
  const result = resolveItemDimensions(row);
  if (result.status === 'incomplete') {
    return { ready: false, missing: result.incomplete.missing, source: null };
  }
  return { ready: true, missing: [], source: result.measures.source };
}
