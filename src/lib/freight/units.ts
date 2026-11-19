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

/**
 * Arredondamento decimal que não perde o empate.
 *
 * `Math.round(value * 10 ** decimals)` erra para baixo quando a multiplicação
 * binária cai do lado errado do meio: `1.005 * 100` é `100.49999999999999`, e o
 * resultado sai `1` em vez de `1.01`. Deslocar a vírgula pela notação
 * exponencial **do texto** do número (`Number('1.005e2') === 100.5`) preserva o
 * empate e não depende da escala do valor — ao contrário de somar
 * `Number.EPSILON`, que é absoluto e só salva valores perto de 1.
 *
 * Um valor que o próprio JavaScript já imprime em notação exponencial
 * (`1e-7`) produziria texto inválido (`'1e-7e2'`), então aí cai no `toFixed`,
 * que é exato para essa faixa.
 */
function roundDecimal(value: number, decimals: number): number {
  const shifted = Number(`${value}e${decimals}`);
  if (!Number.isFinite(shifted)) return Number(value.toFixed(decimals));
  return Number(`${Math.round(shifted)}e-${decimals}`);
}

/** Arredonda para 1 casa decimal. */
export function round1(value: MaybeNumber): number | null {
  if (!isUsable(value)) return null;
  return roundDecimal(value, 1);
}

/** Arredonda para 2 casas decimais. */
export function round2(value: MaybeNumber): number | null {
  if (!isUsable(value)) return null;
  return roundDecimal(value, 2);
}

/** Milímetro → centímetro. `mmToCm(125) === 12.5`. */
export function mmToCm(mm: MaybeNumber): number | null {
  if (!isUsable(mm)) return null;
  return roundDecimal(mm / 10, 2);
}

/** Quilograma → grama. `kgToG(0.35) === 350`. */
export function kgToG(kg: MaybeNumber): number | null {
  if (!isUsable(kg)) return null;
  return roundDecimal(kg * 1000, 2);
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
