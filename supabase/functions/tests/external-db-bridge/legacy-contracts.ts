// Historical pure contracts recovered from 10d607a47^ (before decommission #557).
// Used by preserved unit tests only; index.ts still returns 410 and imports none of this code.

export { applyFilters } from "./legacy-filters.ts";
export { HEAVY_PRODUCT_COLUMNS, LIGHTWEIGHT_LIMIT_THRESHOLD, WIDE_SELECT_COLUMN_THRESHOLD, extractBaseColumn, callerSelectIsHeavy, resolveProductsSelect, logSelectDecision } from "./legacy-select.ts";
