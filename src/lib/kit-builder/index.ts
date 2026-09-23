/**
 * Kit Builder Module
 * Exportações centralizadas
 */

// Types
export * from './types';
export { mmToCm } from './types';

// Mock data
export { MOCK_BOXES, MOCK_ITEMS } from './mock-data';

// Volume Calculator
export {
  calculateVolume,
  calculateUsableVolume,
  calculateTotalItemsVolume,
  calculateVolumeUsagePercent,
  checkItemFits,
  isNearCapacity,
  isAtCapacity,
  formatVolume,
  formatDimensions,
  getVolumeStatusColor,
  getVolumeStatusLabel,
  parseDimensionsString,
  extractProductDimensions,
  estimateDefaultDimensions,
} from './volume-calculator';

// Packaging recommendation (conservative catalogue ranking)
export { evaluateBoxForItems, rankBoxesForItems } from './box-recommendations';
export type { BoxRecommendation, BoxRecommendationStatus } from './box-recommendations';
export { resolveKitAICompositions } from './ai-composition';

// Persistence snapshot contract
export { buildKitPersistencePayload, getPersistedKitStatus } from './persistence';

// Item sorting ("Mais relevantes")
export { sortItemsByRelevance } from './item-sort';
export type { RelevanceSortable } from './item-sort';

// Kit Maker guide content (per-chapter dialog)
export { KIT_MAKER_GUIDE_CHAPTERS, getKitMakerGuideChapter } from './guide-content';
export type { KitMakerGuideChapter, KitMakerGuideChapterId } from './guide-content';

// Price Calculator
export {
  calculateBoxPrice,
  calculateItemsPrice,
  calculatePersonalizationPrice,
  calculateTotalKitPrice,
  calculateSavings,
  formatCurrency,
  formatUnitPrice,
  generatePriceBreakdown,
} from './price-calculator';
