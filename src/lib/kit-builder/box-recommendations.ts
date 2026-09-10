import {
  calculateTotalItemsVolume,
  calculateUsableVolume,
  calculateVolumeUsagePercent,
  checkItemFits,
} from './volume-calculator';
import type { CompatibilityResult, KitBox, KitItem } from './types';

export type BoxRecommendationStatus = 'compatible' | 'incompatible' | 'inconclusive';

export interface BoxRecommendation {
  box: KitBox;
  status: BoxRecommendationStatus;
  compatibility: CompatibilityResult;
  usagePercent: number;
  availableVolume: number;
}

/**
 * Evaluates the selected composition against one packaging option. It is a
 * conservative catalogue ranking, not a packing-layout proof: a compatible
 * result only means that the dimensions and usable-volume heuristics have
 * passed. Missing measurements remain explicitly inconclusive.
 */
export function evaluateBoxForItems(box: KitBox, items: KitItem[]): BoxRecommendation {
  if (items.length === 0) {
    return {
      box,
      status: 'inconclusive',
      compatibility: {
        confidence: 'unknown',
        fits: true,
        reason: 'Adicione itens para calcular a compatibilidade da embalagem.',
      },
      usagePercent: 0,
      availableVolume: calculateUsableVolume(box),
    };
  }

  const positioned: KitItem[] = [];
  let hasUnknownMeasurements = box.dimensionsKnown === false;

  for (const item of items) {
    const compatibility = checkItemFits(item, box, positioned, item.quantity);
    if (!compatibility.fits) {
      return {
        box,
        status: 'incompatible',
        compatibility,
        usagePercent: calculateVolumeUsagePercent(
          calculateTotalItemsVolume(items),
          box.internalVolume,
        ),
        availableVolume: Math.max(0, calculateUsableVolume(box) - calculateTotalItemsVolume(items)),
      };
    }
    hasUnknownMeasurements ||= compatibility.confidence === 'unknown';
    positioned.push(item);
  }

  const totalVolume = calculateTotalItemsVolume(items);
  const usableVolume = calculateUsableVolume(box);
  const usagePercent = calculateVolumeUsagePercent(totalVolume, box.internalVolume);
  return {
    box,
    status: hasUnknownMeasurements ? 'inconclusive' : 'compatible',
    compatibility: hasUnknownMeasurements
      ? {
          confidence: 'unknown',
          fits: true,
          reason: 'Há itens sem medidas confirmadas; confira a embalagem antes de aprovar.',
          percentAfterAdd: usagePercent,
          volumeAfterAdd: totalVolume,
        }
      : {
          confidence: 'verified',
          fits: true,
          percentAfterAdd: usagePercent,
          volumeAfterAdd: totalVolume,
        },
    usagePercent,
    availableVolume: Math.max(0, usableVolume - totalVolume),
  };
}

const STATUS_RANK: Record<BoxRecommendationStatus, number> = {
  compatible: 0,
  inconclusive: 1,
  incompatible: 2,
};

/**
 * Order recommendations deterministically: verified fits first, then
 * incomplete data, and finally incompatible options. Within a status, prefer
 * a balanced usable-volume occupancy and then the lower sale price.
 */
export function rankBoxesForItems(boxes: KitBox[], items: KitItem[]): BoxRecommendation[] {
  return boxes
    .map((box) => evaluateBoxForItems(box, items))
    .sort((left, right) => {
      const statusDifference = STATUS_RANK[left.status] - STATUS_RANK[right.status];
      if (statusDifference !== 0) return statusDifference;
      const occupancyDifference =
        Math.abs(left.usagePercent - 70) - Math.abs(right.usagePercent - 70);
      if (occupancyDifference !== 0) return occupancyDifference;
      return (
        left.box.price - right.box.price || left.box.name.localeCompare(right.box.name, 'pt-BR')
      );
    });
}
