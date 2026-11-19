/**
 * Quantas peças iguais cabem numa caixa — por encaixe em grade, por volume
 * aproveitável e por peso máximo. O menor dos três manda.
 *
 * O encaixe é **conservador**: testa as 6 orientações, mas todas as peças da
 * caixa ficam na mesma. Não gira parte delas para preencher a sobra, então o
 * número é um piso — a caderneta 21 × 14 × 1 dá 140 na caixa G, e girando as
 * sobras caberiam 190. O erro é sempre para o lado de pedir caixa maior, nunca
 * de prometer o que não entra.
 *
 * Os três tetos existem porque cada um sozinho mente:
 *
 * - só geometria ignora que o empacotador real não repete a grade perfeita
 *   em toda caixa, e por isso existe o `fillFactor`;
 * - só volume diz que 27 cubos de 10 cm cabem numa caixa de 30 cm de lado
 *   quando nenhuma orientação permite isso;
 * - só peso deixa a caixa G aceitar 25 kg de caderneta que não entra nela.
 */
import type { Dimensions, FreightSettings, ShippingBox } from './types';
import { isKnownMeasure } from './units';

/** O mínimo que `fitCount` precisa saber de uma peça. `PackItem` satisfaz. */
export interface FittableItem {
  dims: Dimensions;
  weightG: number;
}

/** Qual dos três tetos definiu a capacidade. */
export type FitLimit = 'geometry' | 'volume' | 'weight';

export interface FitResult {
  /**
   * Quantas unidades o motor aceita pôr nesta caixa (piso, ver o cabeçalho).
   * Zero significa que a peça não entra nesta caixa.
   */
  capacity: number;
  /**
   * O teto que definiu a capacidade. Em empate a ordem é geometria → volume →
   * peso, porque é a ordem em que o problema é acionável: geometria pede outra
   * caixa, volume pede rever o fator, peso pede dividir a carga.
   */
  limitedBy: FitLimit;
  /**
   * Os lados da peça na ordem (altura, largura, comprimento) da caixa que
   * rendeu `byGeometry`. `null` quando nenhuma orientação cabe.
   */
  orientation: Dimensions | null;
  byGeometry: number;
  byVolume: number;
  byWeight: number;
}

/**
 * Tolerância do piso de uma divisão. `32.4 / 1.2` em ponto flutuante é
 * `26.999999999999996`: sem isso o suporte de 1,2 cm perderia uma fileira
 * inteira por erro de representação, não por geometria.
 */
const EPSILON = 1e-9;

/** Quem chama garante `denominator > 0`; os três usos abaixo são guardados. */
function floorRatio(numerator: number, denominator: number): number {
  return Math.floor(numerator / denominator + EPSILON);
}

/** As 6 permutações dos lados da peça, sem repetir orientações iguais. */
function orientations(dims: Dimensions): Dimensions[] {
  const [a, b, c] = [dims.heightCm, dims.widthCm, dims.lengthCm];
  const todas: Array<[number, number, number]> = [
    [a, b, c],
    [a, c, b],
    [b, a, c],
    [b, c, a],
    [c, a, b],
    [c, b, a],
  ];
  const vistas = new Set<string>();
  const unicas: Dimensions[] = [];
  for (const [heightCm, widthCm, lengthCm] of todas) {
    const chave = `${heightCm}:${widthCm}:${lengthCm}`;
    if (vistas.has(chave)) continue;
    vistas.add(chave);
    unicas.push({ heightCm, widthCm, lengthCm });
  }
  return unicas;
}

function volumeCm3(dims: Dimensions): number {
  return dims.heightCm * dims.widthCm * dims.lengthCm;
}

/**
 * Fator de aproveitamento a usar: o da caixa quando está num intervalo
 * utilizável, senão o padrão global. Nunca 1 por omissão — um fator ausente
 * que virasse 1 prometeria um empacotamento perfeito.
 */
function fillFactorFor(box: ShippingBox, settings: FreightSettings): number {
  if (isKnownMeasure(box.fillFactor) && box.fillFactor <= 1) return box.fillFactor;
  return settings.defaultFillFactor;
}

export function fitCount(
  item: FittableItem,
  box: ShippingBox,
  settings: FreightSettings,
): FitResult {
  const ladosConhecidos =
    isKnownMeasure(item.dims.heightCm) &&
    isKnownMeasure(item.dims.widthCm) &&
    isKnownMeasure(item.dims.lengthCm);

  let byGeometry = 0;
  let orientation: Dimensions | null = null;
  if (ladosConhecidos) {
    for (const candidata of orientations(item.dims)) {
      const cabe =
        floorRatio(box.inner.heightCm, candidata.heightCm) *
        floorRatio(box.inner.widthCm, candidata.widthCm) *
        floorRatio(box.inner.lengthCm, candidata.lengthCm);
      if (cabe > byGeometry) {
        byGeometry = cabe;
        orientation = candidata;
      }
    }
  }

  const aproveitavel = volumeCm3(box.inner) * fillFactorFor(box, settings);
  // O fator de aproveitamento desconta o espaço que se perde entre peças. Uma
  // peça sozinha que entra na caixa não perde espaço para ninguém: sem o piso
  // de 1, uma peça de 39 × 49 × 59 cm seria recusada na GG (39,4 × 49,4 × 59,4)
  // por ocupar mais de 90% dela.
  const byVolume = Math.max(
    ladosConhecidos ? floorRatio(aproveitavel, volumeCm3(item.dims)) : 0,
    Math.min(byGeometry, 1),
  );

  // Peso não positivo é "sem peso cadastrado", e `resolveItemDimensions` já
  // bloqueia esse produto antes de chegar aqui. Se chegar, não há teto de peso
  // a aplicar — inventar um seria pior que não ter.
  const disponivelG = box.maxWeightG - box.emptyWeightG;
  const byWeight = isKnownMeasure(item.weightG)
    ? Math.max(0, floorRatio(disponivelG, item.weightG))
    : Number.POSITIVE_INFINITY;

  const capacity = Math.min(byGeometry, byVolume, byWeight);

  let limitedBy: FitLimit = 'geometry';
  if (capacity !== byGeometry) limitedBy = capacity === byVolume ? 'volume' : 'weight';

  return {
    capacity,
    limitedBy,
    orientation: capacity > 0 ? orientation : null,
    byGeometry,
    byVolume,
    byWeight,
  };
}
