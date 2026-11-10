import { QUOTE_STATUS_CONFIG, type QuoteStatusConfig } from '@/lib/quote-status-config';

export const statusConfig: Record<
  string,
  { label: string; variant: QuoteStatusConfig['badgeVariant'] }
> = Object.fromEntries(
  Object.entries(QUOTE_STATUS_CONFIG).map(([k, v]) => [
    k,
    { label: v.label, variant: v.badgeVariant },
  ]),
);
