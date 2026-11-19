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
  type ProductMeasureRow,
} from './columns';

export { cm3ToM3, isKnownMeasure, kgToG, mmToCm, round1, round2 } from './units';

export {
  resolveItemDimensions,
  type ResolvedMeasures,
  type ResolveResult,
} from './resolveItemDimensions';

export { expandQuantities, type ExpandResult } from './expandQuantities';
