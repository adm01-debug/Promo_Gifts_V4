import { z } from 'zod';
import type { QuoteItem } from '@/hooks/quotes/quoteTypes';

const optionalNumber = z.number().finite().optional();
const nullableString = z.string().nullish();
function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
const company = z
  .object({
    id: z.string(),
    name: z.string(),
    cnpj: z.string().optional(),
    ramo_atividade: z.string().optional(),
  })
  .passthrough();
const contact = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
    cargo: z.string().optional(),
  })
  .passthrough();
const personalization = z
  .object({
    technique_id: z.string(),
    technique_name: z.string().optional(),
    location_code: z.string().optional(),
    location_name: z.string().optional(),
    colors_count: optionalNumber,
    positions_count: optionalNumber,
    area_cm2: optionalNumber,
    width_cm: optionalNumber,
    height_cm: optionalNumber,
    personalized_quantity: optionalNumber,
    setup_cost: optionalNumber,
    unit_cost: optionalNumber,
    total_cost: optionalNumber,
    notes: z.string().optional(),
  })
  .passthrough();

const item: z.ZodType<QuoteItem> = z
  .object({
    id: z.string().optional(),
    quote_id: z.string().optional(),
    product_id: z.string(),
    product_variant_id: nullableString,
    product_name: z.string(),
    product_description: nullableString,
    product_sku: z.string().optional(),
    product_image_url: z.string().optional(),
    has_personalization: z.boolean().optional(),
    personalization_config: z.json().optional(),
    personalization_cost: optionalNumber,
    mockup_urls: z.array(z.string()).optional(),
    artwork_urls: z.array(z.string()).optional(),
    quantity: z.number().finite(),
    unit_price: z.number().finite(),
    discount_percentage: optionalNumber,
    discount_amount: optionalNumber,
    subtotal: optionalNumber,
    color_name: z.string().optional(),
    color_hex: z.string().optional(),
    notes: z.string().optional(),
    sort_order: optionalNumber,
    bitrix_product_id: z.union([z.string(), z.number().finite(), z.null()]).optional(),
    kit_group_id: nullableString,
    kit_name: nullableString,
    size_code: nullableString,
    gender: nullableString,
    product_category_id: nullableString,
    product_category_name: nullableString,
    price_updated_at: nullableString,
    price_freshness_threshold_days: z.number().finite().nullish(),
    price_confirmed_at: nullableString,
    selected_packaging_id: nullableString,
    selected_packaging_name: nullableString,
    selected_packaging_unit_cost: z.number().finite().nullish(),
    personalizations: z.array(personalization).optional(),
  })
  .passthrough();

export const quoteDraftRecoverySchema = z
  .object({
    clientId: nullableString,
    contactId: nullableString,
    companyInfo: company.nullish(),
    contactInfo: contact.nullish(),
    validityDays: nullableString,
    validUntil: z
      .string()
      .refine((value) => value === '' || isCalendarDate(value))
      .nullish(),
    discountType: z.enum(['amount', 'percent']).nullish(),
    discountValue: z.number().finite().nullish(),
    negotiationMarkup: z.number().finite().nullish(),
    notes: nullableString,
    internalNotes: nullableString,
    paymentMethod: nullableString,
    paymentTerms: nullableString,
    deliveryTime: z
      .string()
      .refine((value) => !value.startsWith('date:') || isCalendarDate(value.slice(5)))
      .nullish(),
    deliveryMode: z.enum(['data', 'prazo']).nullish(),
    deliveryDate: z.iso.datetime().nullish(),
    shippingMethod: nullableString,
    shippingType: nullableString,
    shippingCost: z.number().finite().nullish(),
    items: z.array(item).nullish(),
  })
  .passthrough();

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Mantém as chaves do rascunho restaurado que a tela atual não conhece. A tela
 * manda em tudo que ela modela; o resto sobrevive. Sem base restaurada, devolve
 * os dados da tela sem tocar em nada.
 */
export function mergeRestoredBase(base: unknown, current: unknown): unknown {
  if (!isPlainRecord(base) || !isPlainRecord(current)) return current;
  return { ...base, ...current };
}

/** Envelope íntegro e de fato recuperável, ou `null`. Nunca escreve no storage. */
export function readRecoverableDraft(
  storageKey: string,
  expectedId: string,
  currentData: unknown,
): unknown | null {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(storageKey);
  } catch {
    return null; // storage bloqueado (modo privado, cota): não há oferta a fazer
  }
  if (!stored) return null;

  let envelope: unknown;
  try {
    envelope = JSON.parse(stored);
  } catch {
    return null; // JSON corrompido fica como está, para ser investigado
  }
  if (!isPlainRecord(envelope)) return null;

  const { id, data, savedAt, version } = envelope;
  if (id !== expectedId) return null;
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null;
  if (typeof savedAt !== 'string' || !Number.isFinite(new Date(savedAt).getTime())) return null;
  if (typeof version !== 'number' || !Number.isSafeInteger(version) || version <= 0) return null;

  const parsed = quoteDraftRecoverySchema.safeParse(data);
  if (!parsed.success) return null;

  // Já restaurado (ou idêntico ao que está na tela): não há o que oferecer.
  try {
    if (JSON.stringify(parsed.data) === JSON.stringify(currentData)) return null;
  } catch {
    return null;
  }
  return parsed.data;
}
