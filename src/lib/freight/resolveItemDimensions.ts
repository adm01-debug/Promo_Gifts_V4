/**
 * Borda de entrada do motor: traduz uma linha de `products` em medidas de
 * frete, ou diz exatamente qual campo falta no cadastro.
 *
 * Precedência:
 *   1. `height_cm`/`width_cm`/`length_cm` com os três preenchidos → peça nua
 *      (`product`). Peso: `weight_g`.
 *   2. `diameter_cm` + `height_cm` → caixa envolvente do cilíndrico
 *      (`cylinder`), lados `{h: altura, w: diâmetro, l: diâmetro}`.
 *   3. Nada disso → `incomplete`, nomeando os campos ausentes.
 *
 * **As colunas `box_*` do catálogo não entram aqui.** O plano original mandava
 * usá-las como embalagem individual quando os três lados estivessem
 * preenchidos; os dados refutam isso. Medido em 19/11/2026 em
 * `doufsxqlfjyuvxuezpln`: dos 1.197 produtos ativos com os três lados de
 * `box_*`, 1.153 têm `box_quantity > 1` (média 228,6 peças por caixa), e a
 * mediana do volume dessa caixa é 71× o volume da peça. É a caixa master do
 * fornecedor, que a decisão 3 do projeto manda ignorar para frete. Ler essas
 * colunas faria a garrafa `54601` (400 ml, 67 g) viajar como um volume de
 * 38 × 36 × 36 cm e 5,5 kg.
 *
 * Zero é ausência, não medida (ver `isKnownMeasure`): um produto com
 * `height_cm = 0` não tem altura.
 *
 * Peso desconhecido bloqueia junto com a dimensão: a decisão 7 não admite
 * estimativa parcial.
 */
import type { ProductDimensionRow } from './columns';
import type { Dimensions, IncompleteItem, MeasureSource, MissingMeasure } from './types';
import { isKnownMeasure } from './units';

/** Medidas resolvidas de uma peça, sem quantidade. */
export interface ResolvedMeasures {
  dims: Dimensions;
  weightG: number;
  source: MeasureSource;
}

export type ResolveResult =
  | { status: 'incomplete'; incomplete: IncompleteItem }
  | { status: 'ok'; measures: ResolvedMeasures };

/** Lados da peça nua, ou `null` se algum lado falta. */
function productDims(row: ProductDimensionRow): Dimensions | null {
  if (
    !isKnownMeasure(row.height_cm) ||
    !isKnownMeasure(row.width_cm) ||
    !isKnownMeasure(row.length_cm)
  ) {
    return null;
  }
  return { heightCm: row.height_cm, widthCm: row.width_cm, lengthCm: row.length_cm };
}

/** Caixa envolvente de um cilíndrico, ou `null` sem diâmetro ou sem altura. */
function cylinderDims(row: ProductDimensionRow): Dimensions | null {
  if (!isKnownMeasure(row.diameter_cm) || !isKnownMeasure(row.height_cm)) return null;
  return { heightCm: row.height_cm, widthCm: row.diameter_cm, lengthCm: row.diameter_cm };
}

/**
 * Campos de dimensão que o cadastro precisa receber. O diâmetro cobre largura
 * e comprimento: quem tem diâmetro só precisa da altura.
 */
function missingDimensionFields(row: ProductDimensionRow): MissingMeasure[] {
  const hasDiameter = isKnownMeasure(row.diameter_cm);
  const missing: MissingMeasure[] = [];
  if (!isKnownMeasure(row.height_cm)) missing.push('height');
  if (!isKnownMeasure(row.width_cm) && !hasDiameter) missing.push('width');
  if (!isKnownMeasure(row.length_cm) && !hasDiameter) missing.push('length');
  return missing;
}

/** Aplica a precedência e devolve a primeira fonte que fecha os três lados. */
function resolveDims(row: ProductDimensionRow): { dims: Dimensions; source: MeasureSource } | null {
  const product = productDims(row);
  if (product) return { dims: product, source: 'product' };

  const cylinder = cylinderDims(row);
  if (cylinder) return { dims: cylinder, source: 'cylinder' };

  return null;
}

export function resolveItemDimensions(row: ProductDimensionRow): ResolveResult {
  const resolved = resolveDims(row);

  const missing: MissingMeasure[] = resolved ? [] : missingDimensionFields(row);
  const weightG = isKnownMeasure(row.weight_g) ? row.weight_g : null;
  if (weightG === null) missing.push('weight');

  if (!resolved || weightG === null) {
    return {
      status: 'incomplete',
      incomplete: { productId: row.id, name: row.name, missing },
    };
  }

  return {
    status: 'ok',
    measures: { dims: resolved.dims, weightG, source: resolved.source },
  };
}
