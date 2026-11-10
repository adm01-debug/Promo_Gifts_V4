export function normalizeBitrixQuoteId(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) return trimmed.replace(/^0+/, '') || null;
    value = Number(trimmed);
  }
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
    ? String(value)
    : null;
}
