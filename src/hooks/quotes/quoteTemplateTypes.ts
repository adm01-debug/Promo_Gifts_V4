/**
 * Tipos publicos de `quote_templates`.
 *
 * Em modulo proprio porque `useQuoteTemplates.ts` esta no limite do ratchet de
 * tamanho de arquivo (500 linhas) e o bloco de tipos nao e logica de hook. O hook
 * reexporta tudo, entao os importadores existentes seguem valendo.
 */
import type { Tables } from '@/integrations/supabase/types';

export type QuoteTemplateRow = Tables<'quote_templates'>;

export interface QuoteTemplateItem {
  productId?: string;
  productSku?: string;
  productName: string;
  productImageUrl?: string;
  quantity: number;
  unitPrice: number;
  colorName?: string;
  colorHex?: string;
  personalizations?: {
    techniqueId: string;
    techniqueName: string;
    colorsCount?: number;
    positionsCount?: number;
    unitCost?: number;
    setupCost?: number;
  }[];
}

/**
 * Template como a UI consome. Estende a LINHA da tabela: `transformTemplates` faz
 * `...item`, entao toda coluna de `quote_templates` chega aqui e quem le uma delas
 * segue funcionando (travado por tests/hooks/useQuoteTemplates.raw-fetch.test.ts).
 * Antes isso exigia `as unknown as QuoteTemplate[]`, que escondia qualquer
 * divergencia de tipo da linha.
 */
type CamposNormalizados =
  | 'discount_amount'
  | 'discount_percent'
  | 'is_default'
  | 'items'
  | 'template_data'
  | 'validity_days';

export interface QuoteTemplate extends Omit<QuoteTemplateRow, CamposNormalizados> {
  is_default: boolean;
  template_data: Record<string, unknown>;
  items: QuoteTemplateItem[];
  raw_items?: QuoteTemplateRow['items'];
  raw_template_data?: QuoteTemplateRow['template_data'];
  discount_percent: number;
  discount_amount: number;
  validity_days: number;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  is_default?: boolean;
  items?: QuoteTemplateItem[];
  discount_percent?: number;
  discount_amount?: number;
  notes?: string;
  internal_notes?: string;
  payment_terms?: string;
  delivery_time?: string;
  validity_days?: number;
}
