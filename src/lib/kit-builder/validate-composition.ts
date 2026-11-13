import { checkItemFits } from './volume-calculator';
import { getKitItemLineId, type KitBox, type KitItem, type KitPersonalization } from './types';
import { hasKnownKitPrices } from './pricing-availability';

interface KitValidationInput {
  box: KitBox | null;
  items: KitItem[];
  personalization: KitPersonalization;
  kitQuantity: number;
  volumeUsagePercent: number;
  itemsWeight: number;
}

export function getKitValidationErrors({
  box: selectedBox,
  items: selectedItems,
  personalization,
  kitQuantity,
  volumeUsagePercent,
  itemsWeight,
}: KitValidationInput): string[] {
  const validationErrors: string[] = [];
  if (!selectedBox) validationErrors.push('Selecione uma caixa');
  if (selectedItems.length === 0) validationErrors.push('Adicione pelo menos um item ao kit');
  if (!hasKnownKitPrices({ box: selectedBox, items: selectedItems }))
    validationErrors.push('Há preço não informado ou inválido no kit');
  if (volumeUsagePercent > 100)
    validationErrors.push('Volume dos itens excede a capacidade da caixa');

  if (selectedBox) {
    if (selectedBox.dimensionsKnown === false) {
      validationErrors.push('A caixa selecionada não possui dimensões internas confirmadas');
    }
    const itemWithUnknownDimensions = selectedItems.find((item) => item.dimensionsKnown === false);
    if (itemWithUnknownDimensions) {
      validationErrors.push(
        `${itemWithUnknownDimensions.name} não possui dimensões confirmadas para validação`,
      );
    }
    const incompatibleItem = selectedItems.find((item) => {
      const otherItems = selectedItems.filter((candidate) => candidate !== item);
      return !checkItemFits(item, selectedBox, otherItems, item.quantity).fits;
    });
    if (incompatibleItem) {
      validationErrors.push(`${incompatibleItem.name} não é compatível com a caixa selecionada`);
    }
  }

  // Weight validation
  if (selectedBox?.maxWeight && itemsWeight > selectedBox.maxWeight) {
    validationErrors.push(
      `Peso dos itens (${(itemsWeight / 1000).toFixed(1)}kg) excede o limite da caixa (${(selectedBox.maxWeight / 1000).toFixed(1)}kg)`,
    );
  }

  const incompletePersonalization = [
    personalization.box,
    ...Object.values(personalization.items),
  ].find(
    (config) =>
      config.enabled &&
      (!config.techniqueId || !(config.positionCode || config.position || config.positionName)),
  );
  if (incompletePersonalization) {
    validationErrors.push('Conclua técnica e área de aplicação da personalização antes de revisar');
  }

  const personalizationPricingTargets = [
    { config: personalization.box, quantity: kitQuantity },
    ...selectedItems.map((item) => ({
      config: personalization.items[getKitItemLineId(item)] ?? personalization.items[item.id],
      quantity: item.quantity * kitQuantity,
    })),
  ];
  const personalizationWithoutPrice = personalizationPricingTargets.find(
    ({ config, quantity }) =>
      config?.enabled &&
      (!Number.isFinite(config.estimatedPrice) ||
        (config.estimatedPrice ?? -1) <= 0 ||
        config.pricedQuantity !== quantity ||
        !Number.isFinite(config.totalPrice) ||
        (config.totalPrice ?? -1) <= 0),
  );
  if (personalizationWithoutPrice) {
    validationErrors.push(
      'Aguarde o preço da personalização antes de revisar ou criar o orçamento',
    );
  }

  return validationErrors;
}
