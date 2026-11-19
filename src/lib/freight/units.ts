/**
 * Conversão de unidades e teste de medida conhecida.
 *
 * O catálogo guarda a peça em cm/g e a embalagem em mm/kg. O motor trabalha
 * só em cm/g, então toda tradução passa por aqui.
 *
 * Contrato comum a todos os conversores: entrada não finita (`null`,
 * `undefined`, `NaN`, `Infinity`) ou **negativa** devolve `null` — não zero.
 * Zero é um valor legítimo na conversão (0 mm = 0 cm); quem decide que zero
 * significa "não cadastrado" é `isKnownMeasure`.
 *
 * Toda conversão arredonda: `0.35 * 1000` em ponto flutuante é
 * `350.00000000000006`, e um peso que não fecha vaza para o total do volume.
 */

/** Entrada aceitável para um conversor: número, nulo ou ausente. */
type MaybeNumber = number | null | undefined;

function isUsable(value: MaybeNumber): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/** Arredonda para 1 casa decimal. */
export function round1(value: MaybeNumber): number | null {
  if (!isUsable(value)) return null;
  return Math.round(value * 10) / 10;
}

/** Arredonda para 2 casas decimais. */
export function round2(value: MaybeNumber): number | null {
  if (!isUsable(value)) return null;
  return Math.round(value * 100) / 100;
}

/** Milímetro → centímetro. `mmToCm(125) === 12.5`. */
export function mmToCm(mm: MaybeNumber): number | null {
  if (!isUsable(mm)) return null;
  return Math.round((mm / 10) * 100) / 100;
}

/** Quilograma → grama. `kgToG(0.35) === 350`. */
export function kgToG(kg: MaybeNumber): number | null {
  if (!isUsable(kg)) return null;
  return Math.round(kg * 1000 * 100) / 100;
}

/** cm³ → m³. `cm3ToM3(1_000_000) === 1`. */
export function cm3ToM3(cm3: MaybeNumber): number | null {
  if (!isUsable(cm3)) return null;
  return cm3 / 1_000_000;
}

/**
 * Uma medida só é informação quando é finita e maior que zero.
 *
 * O catálogo usa zero como ausência de dado — 7.951 produtos ativos e nenhuma
 * garantia de preenchimento —, então tratar zero como medida produziria um
 * volume de peso zero ou uma caixa de lado zero. Generaliza
 * `isKnownItemWeight` (`src/lib/kit-builder/weight.ts`), que agora delega aqui.
 */
export function isKnownMeasure(value: MaybeNumber): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}
