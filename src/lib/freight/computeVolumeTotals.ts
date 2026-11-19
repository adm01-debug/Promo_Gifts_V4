/**
 * Fecha os números de **um** volume: peso bruto, peso cubado, metros cúbicos e
 * ocupação.
 *
 * O peso cubado usa a medida **externa** da caixa, porque é o que a
 * transportadora mede, e os dois divisores de mercado convivem: 6.000 cm³/kg
 * nos Correios e 3.333 cm³/kg no rodoviário. Qual dos dois vale é decisão da
 * cotação (bloco I), não deste cálculo — por isso os dois saem juntos.
 *
 * A ocupação é relativa ao volume **aproveitável** (interno × fator), não ao
 * interno cru: é o número que responde "valeu a pena abrir esta caixa?".
 */
import { volumeCm3 } from './boxOrder';
import type { CubicWeightG, FreightSettings, PackItem, PackVolume, ShippingBox } from './types';
import { isKnownMeasure, roundDecimal } from './units';

/** Uma caixa aberta com o que foi colocado dentro, antes de fechar as contas. */
export interface VolumeDraft {
  box: ShippingBox;
  contents: Array<{ item: PackItem; quantity: number }>;
}

function cubicWeight(outerVolumeCm3: number, divisor: number): number {
  if (!isKnownMeasure(divisor)) return 0;
  return roundDecimal((outerVolumeCm3 / divisor) * 1000, 2);
}

export function computeVolumeTotals(draft: VolumeDraft, settings: FreightSettings): PackVolume {
  const { box, contents } = draft;

  const pesoItensG = contents.reduce(
    (total, { item, quantity }) => total + item.weightG * quantity,
    0,
  );
  const grossWeightG = roundDecimal(box.emptyWeightG + pesoItensG, 2);

  const outerVolumeCm3 = volumeCm3(box.outer);
  const cubicWeightG: CubicWeightG = {
    correios: cubicWeight(outerVolumeCm3, settings.cubicDivisorCorreios),
    rodoviario: cubicWeight(outerVolumeCm3, settings.cubicDivisorRodoviario),
  };

  const fator =
    isKnownMeasure(box.fillFactor) && box.fillFactor <= 1
      ? box.fillFactor
      : settings.defaultFillFactor;
  const aproveitavel = volumeCm3(box.inner) * fator;
  const ocupado = contents.reduce(
    (total, { item, quantity }) => total + volumeCm3(item.dims) * quantity,
    0,
  );

  return {
    box,
    items: contents.map(({ item, quantity }) => ({ productId: item.productId, quantity })),
    grossWeightG,
    cubicWeightG,
    // 6 casas é exatamente a resolução de 1 cm³ em m³.
    volumeM3: roundDecimal(outerVolumeCm3 / 1_000_000, 6),
    fillRatio: isKnownMeasure(aproveitavel) ? ocupado / aproveitavel : 0,
  };
}
