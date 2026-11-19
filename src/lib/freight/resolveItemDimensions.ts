/**
 * Borda de entrada do motor: traduz uma linha de `products` em medidas de
 * frete, ou diz exatamente qual campo falta no cadastro.
 *
 * Precedência (decisão 2 do projeto):
 *   1. `box_*_mm` com os **três** lados preenchidos → embalagem (`packaging`).
 *      Peso: `box_weight_kg` quando conhecido, senão `weight_g`.
 *   2. `height_cm`/`width_cm`/`length_cm` com os três preenchidos → peça nua
 *      (`product`). Peso: `weight_g`.
 *   3. `diameter_cm` + `height_cm` → caixa envolvente do cilíndrico
 *      (`cylinder`), lados `{h: altura, w: diâmetro, l: diâmetro}`.
 *   4. Nada disso → `incomplete`, nomeando os campos ausentes.
 *
 * Zero é ausência, não medida (ver `isKnownMeasure`): um produto com
 * `box_weight_kg = 0` cai no `weight_g`, e um com `height_cm = 0` não tem
 * altura. Isso não é teoria — `34702` tem `box_weight_kg = 0.000` em produção.
 *
 * Peso desconhecido bloqueia junto com a dimensão: a decisão 7 não admite
 * estimativa parcial.
 */
import type { ProductMeasureRow } from './columns';
import type { Dimensions, IncompleteItem, MeasureSource, MissingMeasure } from './types';
import { isKnownMeasure, kgToG, mmToCm } from './units';

/** Medidas resolvidas de uma peça, sem quantidade. */
export interface ResolvedMeasures {
  dims: Dimensions;
  weightG: number;
  source: MeasureSource;
}

export type ResolveResult =
  | { status: 'incomplete'; incomplete: IncompleteItem }
  | { status: 'ok'; measures: ResolvedMeasures };

/** Lados da embalagem individual em cm, ou `null` se algum lado falta. */
function packagingDims(row: ProductMeasureRow): Dimensions | null {
  const heightCm = mmToCm(row.box_height_mm);
  const widthCm = mmToCm(row.box_width_mm);
  const lengthCm = mmToCm(row.box_length_mm);
  if (!isKnownMeasure(heightCm) || !isKnownMeasure(widthCm) || !isKnownMeasure(lengthCm)) {
    return null;
  }
  return { heightCm, widthCm, lengthCm };
}

/** Lados da peça nua, ou `null` se algum lado falta. */
function productDims(row: ProductMeasureRow): Dimensions | null {
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
function cylinderDims(row: ProductMeasureRow): Dimensions | null {
  if (!isKnownMeasure(row.diameter_cm) || !isKnownMeasure(row.height_cm)) return null;
  return { heightCm: row.height_cm, widthCm: row.diameter_cm, lengthCm: row.diameter_cm };
}

/**
 * Campos de dimensão que o cadastro precisa receber. Reporta sempre no nível
 * da peça, porque é lá que o admin digita. O diâmetro cobre largura e
 * comprimento: quem tem diâmetro só precisa da altura.
 */
function missingDimensionFields(row: ProductMeasureRow): MissingMeasure[] {
  const hasDiameter = isKnownMeasure(row.diameter_cm);
  const missing: MissingMeasure[] = [];
  if (!isKnownMeasure(row.height_cm)) missing.push('height');
  if (!isKnownMeasure(row.width_cm) && !hasDiameter) missing.push('width');
  if (!isKnownMeasure(row.length_cm) && !hasDiameter) missing.push('length');
  return missing;
}

/**
 * Peso em gramas pela fonte das dimensões. Na embalagem, `box_weight_kg` já
 * inclui o papelão da embalagem individual e por isso vence; zero não vence.
 */
function resolveWeightG(row: ProductMeasureRow, source: MeasureSource): number | null {
  if (source === 'packaging') {
    const fromBox = kgToG(row.box_weight_kg);
    if (isKnownMeasure(fromBox)) return fromBox;
  }
  return isKnownMeasure(row.weight_g) ? row.weight_g : null;
}

/** Aplica a precedência e devolve a primeira fonte que fecha os três lados. */
function resolveDims(row: ProductMeasureRow): { dims: Dimensions; source: MeasureSource } | null {
  const packaging = packagingDims(row);
  if (packaging) return { dims: packaging, source: 'packaging' };

  const product = productDims(row);
  if (product) return { dims: product, source: 'product' };

  const cylinder = cylinderDims(row);
  if (cylinder) return { dims: cylinder, source: 'cylinder' };

  return null;
}

export function resolveItemDimensions(row: ProductMeasureRow): ResolveResult {
  const resolved = resolveDims(row);

  const missing: MissingMeasure[] = resolved ? [] : missingDimensionFields(row);
  const weightG = resolveWeightG(row, resolved?.source ?? 'product');
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
