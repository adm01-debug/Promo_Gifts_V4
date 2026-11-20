/**
 * Motor de frete — barril público.
 *
 * Contrato, unidades e limites em `./README.md`.
 */

export type {
  CubicWeightG,
  Dimensions,
  FreightPlan,
  FreightPlanStatus,
  FreightPlanTotals,
  FreightSettings,
  IncompleteItem,
  MeasureSource,
  MissingMeasure,
  MixMode,
  PackItem,
  PackVolume,
  ShippingBox,
  ValidationError,
} from './types';

export {
  PRODUCT_MEASURE_COLUMNS,
  PRODUCT_MEASURE_SELECT,
  type ProductMeasureColumn,
  type ProductDimensionRow,
  type ProductMeasureRow,
} from './columns';

export { cm3ToM3, isKnownMeasure, kgToG, mmToCm, round1, round2 } from './units';

export {
  toFreightSettings,
  toShippingBox,
  type FreightSettingsSource,
  type ShippingBoxSource,
} from './fromDatabase';

export {
  resolveItemDimensions,
  type ResolvedMeasures,
  type ResolveResult,
} from './resolveItemDimensions';

export { expandQuantities, type ExpandResult } from './expandQuantities';

export { getFreightReadiness, type FreightReadiness } from './readiness';

export {
  daMaiorParaMenor,
  daMenorParaMaior,
  maiorCaixa,
  volumeCm3,
  volumeInternoCm3,
} from './boxOrder';

export { fitCount, type FitLimit, type FitResult, type FittableItem } from './fitCount';

export { buildGroups, type GroupReason, type PackGroup } from './buildGroups';

export { packSingleProduct, type PackResult } from './packSingleProduct';
export { packMixed } from './packMixed';

export { computeVolumeTotals, type VolumeDraft } from './computeVolumeTotals';

export { computeItemsHash, planFreight, type PlanInput, type PlanOptions } from './planFreight';

export { formatPlanSummary } from './formatPlanSummary';

export { formatPlanForClient } from './format';
