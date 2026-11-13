import { useCallback, useMemo, useState } from 'react';
import {
  useQuoteTemplates as useCanonicalQuoteTemplates,
  type QuoteTemplate as CanonicalQuoteTemplate,
  type QuoteTemplateItem,
  type CreateTemplateInput as CanonicalCreateTemplateInput,
} from './quotes/useQuoteTemplates';
import type { Tables } from '@/integrations/supabase/types';

export type { QuoteTemplateItem } from './quotes/useQuoteTemplates';

type QuoteTemplateRow = Tables<'quote_templates'>;

type NullableTemplateField =
  | 'created_at'
  | 'delivery_time'
  | 'description'
  | 'internal_notes'
  | 'notes'
  | 'payment_terms'
  | 'seller_id'
  | 'updated_at';

type QuoteTemplateFields = Omit<
  CanonicalQuoteTemplate,
  NullableTemplateField | 'items' | 'template_data'
> &
  Partial<
    Pick<
      QuoteTemplateRow,
      | 'category'
      | 'created_by'
      | 'is_active'
      | 'payment_method'
      | 'shipping_cost'
      | 'shipping_type'
      | 'usage_count'
    >
  > &
  Partial<Pick<QuoteTemplateRow, NullableTemplateField>> &
  Pick<QuoteTemplateRow, 'created_at' | 'seller_id' | 'updated_at'> & {
    items: unknown;
    template_data: unknown;
  };

type ValidatedTemplateItems =
  | { items_data: null; items_error: string }
  | { items_data: QuoteTemplateItem[]; items_error: null };

export type QuoteTemplate = QuoteTemplateFields & ValidatedTemplateItems;

export interface CreateTemplateInput extends Omit<CanonicalCreateTemplateInput, 'items'> {
  items_data?: QuoteTemplateItem[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalFieldMatches(
  value: Record<string, unknown>,
  fields: string[],
  predicate: (entry: unknown) => boolean,
): boolean {
  return fields.every((field) => value[field] === undefined || predicate(value[field]));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isQuoteTemplateItem(value: unknown): value is QuoteTemplateItem {
  if (
    !isRecord(value) ||
    typeof value.productName !== 'string' ||
    !isFiniteNumber(value.quantity) ||
    !isFiniteNumber(value.unitPrice)
  )
    return false;
  if (
    !optionalFieldMatches(
      value,
      ['productId', 'productSku', 'productImageUrl', 'colorName', 'colorHex'],
      isString,
    )
  )
    return false;
  if (value.personalizations === undefined) return true;
  return (
    Array.isArray(value.personalizations) &&
    value.personalizations.every(
      (entry: unknown) =>
        isRecord(entry) &&
        typeof entry.techniqueId === 'string' &&
        typeof entry.techniqueName === 'string' &&
        optionalFieldMatches(
          entry,
          ['colorsCount', 'positionsCount', 'unitCost', 'setupCost'],
          isFiniteNumber,
        ),
    )
  );
}

function validateTemplateItems(value: unknown): ValidatedTemplateItems {
  if (!Array.isArray(value)) {
    return {
      items_data: null,
      items_error:
        'Os itens deste template precisam de revisão. Os dados originais foram preservados.',
    };
  }
  const items: QuoteTemplateItem[] = [];
  for (const [index, entry] of value.entries()) {
    if (!isQuoteTemplateItem(entry)) {
      return {
        items_data: null,
        items_error: `O item ${index + 1} contém dados incompletos ou inválidos. Os dados originais foram preservados.`,
      };
    }
    items.push(entry);
  }
  return { items_data: items, items_error: null };
}

function toLegacyTemplate(row: CanonicalQuoteTemplate | QuoteTemplateRow): QuoteTemplate {
  const rawItems = 'raw_items' in row ? row.raw_items : row.items;
  const rawTemplateData = 'raw_template_data' in row ? row.raw_template_data : row.template_data;
  return {
    ...row,
    items: rawItems,
    template_data: rawTemplateData,
    is_default: row.is_default ?? false,
    discount_percent: row.discount_percent ?? 0,
    discount_amount: row.discount_amount ?? 0,
    validity_days: row.validity_days ?? 30,
    ...validateTemplateItems(rawItems),
  };
}

function toCanonicalInput(
  input: Partial<CreateTemplateInput>,
): Partial<CanonicalCreateTemplateInput> {
  const { items_data, ...fields } = input;
  return { ...fields, ...(items_data === undefined ? {} : { items: items_data }) };
}

export function useQuoteTemplates() {
  const canonical = useCanonicalQuoteTemplates();
  const [validationError, setValidationError] = useState<string | null>(null);
  const {
    createTemplate: createCanonicalTemplate,
    updateTemplate: updateCanonicalTemplate,
    setDefaultTemplate: setCanonicalDefaultTemplate,
    duplicateTemplate: duplicateCanonicalTemplate,
    cloneTemplateToSeller: cloneCanonicalTemplateToSeller,
  } = canonical;
  const templates = useMemo(() => canonical.templates.map(toLegacyTemplate), [canonical.templates]);
  const allTemplates = useMemo(
    () => canonical.allTemplates.map(toLegacyTemplate),
    [canonical.allTemplates],
  );

  const createTemplate = useCallback(
    async (input: CreateTemplateInput): Promise<QuoteTemplate | null> => {
      const { items_data, ...fields } = input;
      const validation = validateTemplateItems(items_data === undefined ? [] : items_data);
      if (validation.items_error) {
        setValidationError(validation.items_error);
        return null;
      }
      setValidationError(null);
      const row = await createCanonicalTemplate({ ...fields, items: items_data });
      return row ? toLegacyTemplate(row) : null;
    },
    [createCanonicalTemplate],
  );

  const updateTemplate = useCallback(
    async (id: string, updates: Partial<CreateTemplateInput>): Promise<QuoteTemplate | null> => {
      if (updates.items_data !== undefined) {
        const validation = validateTemplateItems(updates.items_data);
        if (validation.items_error) {
          setValidationError(validation.items_error);
          return null;
        }
      }
      setValidationError(null);
      const row = await updateCanonicalTemplate(id, toCanonicalInput(updates));
      return row ? toLegacyTemplate(row) : null;
    },
    [updateCanonicalTemplate],
  );

  const setDefaultTemplate = useCallback(
    async (id: string): Promise<QuoteTemplate | null> => {
      const row = await setCanonicalDefaultTemplate(id);
      return row ? toLegacyTemplate(row) : null;
    },
    [setCanonicalDefaultTemplate],
  );

  const duplicateTemplate = useCallback(
    async (id: string): Promise<QuoteTemplate | null> => {
      const row = await duplicateCanonicalTemplate(id);
      return row ? toLegacyTemplate(row) : null;
    },
    [duplicateCanonicalTemplate],
  );

  const cloneTemplateToSeller = useCallback(
    async (id: string, sellerId: string): Promise<QuoteTemplate | null> => {
      const row = await cloneCanonicalTemplateToSeller(id, sellerId);
      return row ? toLegacyTemplate(row) : null;
    },
    [cloneCanonicalTemplateToSeller],
  );

  return {
    ...canonical,
    error: validationError ?? canonical.error,
    templates,
    allTemplates,
    createTemplate,
    updateTemplate,
    setDefaultTemplate,
    duplicateTemplate,
    cloneTemplateToSeller,
  };
}
