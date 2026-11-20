/**
 * Fallback de `price_freshness_threshold_days`: bancos sem a coluna recusam a escrita.
 * Movido de AdminProductFormPage.tsx sem mudança de comportamento (limite de tamanho do arquivo).
 */
const PRICE_FRESHNESS_THRESHOLD_COLUMN = 'price_freshness_threshold_days';

export function isMissingPriceFreshnessThresholdColumn(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /price_freshness_threshold_days|column products\.price_freshness_threshold_days does not exist/i.test(
    message,
  );
}

export function withoutPriceFreshnessThreshold(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const fallbackData = { ...data };
  delete fallbackData[PRICE_FRESHNESS_THRESHOLD_COLUMN];
  return fallbackData;
}
