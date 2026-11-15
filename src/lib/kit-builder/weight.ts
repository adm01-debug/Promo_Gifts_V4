/**
 * Peso zero, negativo ou não numérico não é uma medição útil para estimar frete.
 * O catálogo usa zero como ausência de informação, então o kit deve manter essa
 * incerteza visível em vez de tratar o item como se não tivesse peso.
 */
export function isKnownItemWeight(weight: number | null | undefined): weight is number {
  return typeof weight === 'number' && Number.isFinite(weight) && weight > 0;
}

type WeightedItem = { weight?: number | null; quantity: number };
type WeightedBox = { weight?: number | null } | null | undefined;

export function summarizeKitWeight(
  items: readonly WeightedItem[],
  box?: WeightedBox,
): { totalWeightGrams: number; itemsWeightGrams: number; unknownWeightCount: number } {
  const unknownItems = items.filter((item) => !isKnownItemWeight(item.weight)).length;
  const unknownBox = box !== null && box !== undefined && !isKnownItemWeight(box.weight) ? 1 : 0;
  const boxWeight = box && isKnownItemWeight(box.weight) ? box.weight : 0;
  const itemsWeightGrams = items.reduce(
    (total, item) => total + (isKnownItemWeight(item.weight) ? item.weight * item.quantity : 0),
    0,
  );

  return {
    totalWeightGrams: boxWeight + itemsWeightGrams,
    itemsWeightGrams,
    unknownWeightCount: unknownItems + unknownBox,
  };
}
