import { z } from 'zod';
import type { Tables } from '@/integrations/supabase/types';
import type { KitQuoteClient } from '@/pages/kit-builder/useKitBuilderQuote';
import type { KitAISuggestionBrief, KitBuilderFlow, KitIdentity, KitType } from '../types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readDraftNotes(personalizationData: Record<string, unknown>): string {
  const draft = isRecord(personalizationData.__draft) ? personalizationData.__draft : null;
  const notes = draft?.notes;
  return typeof notes === 'string' ? notes : '';
}

function readDraftClient(personalizationData: Record<string, unknown>): KitQuoteClient {
  const draft = isRecord(personalizationData.__draft) ? personalizationData.__draft : null;
  const client = draft && isRecord(draft.quoteClient) ? draft.quoteClient : null;
  if (!client) return {};

  const text = (key: string): string | undefined => {
    const value = client[key];
    return typeof value === 'string' ? value : undefined;
  };
  return {
    client_cnpj: text('client_cnpj'),
    client_company: text('client_company'),
    client_email: text('client_email'),
    client_id: text('client_id'),
    client_name: text('client_name'),
    client_phone: text('client_phone'),
  };
}

function readDraftFlow(personalizationData: Record<string, unknown>): KitBuilderFlow | undefined {
  const draft = isRecord(personalizationData.__draft) ? personalizationData.__draft : null;
  const flow = draft?.flow;
  return flow === 'box-first' || flow === 'items-first' ? flow : undefined;
}

function readDraftAIBriefing(
  personalizationData: Record<string, unknown>,
): KitAISuggestionBrief | undefined {
  const draft = isRecord(personalizationData.__draft) ? personalizationData.__draft : null;
  const briefing = draft?.aiBriefing;
  if (!isRecord(briefing)) return undefined;

  const kitType = briefing.kit_type;
  const targetPrice = briefing.target_price_brl;
  if (
    (kitType !== 'montado' && kitType !== 'original' && kitType !== 'simples') ||
    !isRecord(targetPrice) ||
    !Number.isFinite(targetPrice.min) ||
    !Number.isFinite(targetPrice.max)
  ) {
    return undefined;
  }

  const strings = (value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

  return {
    kit_type: kitType,
    box_keywords: strings(briefing.box_keywords),
    item_keywords: strings(briefing.item_keywords),
    target_price_brl: { min: Number(targetPrice.min), max: Number(targetPrice.max) },
    narrative: typeof briefing.narrative === 'string' ? briefing.narrative : '',
    ...(typeof briefing.title === 'string' ? { title: briefing.title } : {}),
    ...(typeof briefing.description === 'string' ? { description: briefing.description } : {}),
    ...(typeof briefing.style_tag === 'string' ? { style_tag: briefing.style_tag } : {}),
  };
}

const snapshotNumber = z.number().finite().nonnegative();
const snapshotDimension = z.number().finite().positive();
const itemPersonalizationSnapshotSchema = z
  .object({
    enabled: z.boolean(),
    techniqueId: z.string().optional(),
    techniqueName: z.string().optional(),
    techniqueCode: z.string().optional(),
    colors: snapshotNumber.optional(),
    width: snapshotNumber.optional(),
    height: snapshotNumber.optional(),
    positionCode: z.string().optional(),
    positionName: z.string().optional(),
    position: z.string().optional(),
    artworkUrl: z.string().optional(),
    generatedMockupUrl: z.string().optional(),
    artworkColors: z.array(z.string()).optional(),
    estimatedPrice: snapshotNumber.optional(),
    setupCost: snapshotNumber.optional(),
    totalPrice: snapshotNumber.optional(),
    pricedQuantity: snapshotNumber.optional(),
  })
  .passthrough();
// `{}` é o valor gravado em 15 de 21 kits de produção (13/11) e significa "sem personalização":
// caixa/itens ausentes assumem desligado em vez de derrubar a hidratação do kit inteiro.
const personalizationSnapshotSchema = z
  .object({
    box: itemPersonalizationSnapshotSchema.default({ enabled: false }),
    items: z.record(z.string(), itemPersonalizationSnapshotSchema).default({}),
  })
  .passthrough();
const boxSnapshotSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    sku: z.string(),
    imageUrl: z.string().nullable(),
    price: snapshotNumber,
    priceKnown: z.boolean().optional(),
    internalWidth: snapshotDimension,
    internalHeight: snapshotDimension,
    internalDepth: snapshotDimension,
    internalVolume: snapshotDimension,
    dimensionsKnown: z.boolean().optional(),
    boxType: z.string().optional(),
    color: z.string().optional(),
    material: z.string().optional(),
    materials: z.array(z.string()).optional(),
    finish: z.string().optional(),
    weight: snapshotNumber.optional(),
    maxWeight: snapshotNumber.optional(),
  })
  .passthrough();
const itemSnapshotSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    sku: z.string(),
    imageUrl: z.string().nullable(),
    price: snapshotNumber,
    priceKnown: z.boolean().optional(),
    width: snapshotDimension,
    height: snapshotDimension,
    depth: snapshotDimension,
    volume: snapshotDimension,
    quantity: z.number().int().positive().safe(),
    lineId: z.string().optional(),
    dimensionsKnown: z.boolean().optional(),
    weight: snapshotNumber.optional(),
    stock: snapshotNumber.nullable().optional(),
    category: z.string().optional(),
    material: z.string().optional(),
    selectedColor: z
      .object({ name: z.string(), hex: z.string().optional() })
      .passthrough()
      .optional(),
    selectedVariantId: z.string().optional(),
    selectedSize: z.string().optional(),
    isOptional: z.boolean().optional(),
    isReplaceable: z.boolean().optional(),
    isPackaging: z.boolean().optional(),
    allowsPersonalization: z.boolean().optional(),
    personalizationNotes: z.string().optional(),
    allowedVariantIds: z.array(z.string()).optional(),
    personalization: itemPersonalizationSnapshotSchema.optional(),
  })
  .passthrough();

type SavedKitSource = Omit<
  Pick<
    Tables<'custom_kits'>,
    | 'box_data'
    | 'color'
    | 'description'
    | 'icon'
    | 'is_favorite'
    | 'items_data'
    | 'kit_quantity'
    | 'kit_type'
    | 'name'
    | 'personalization_data'
    | 'tag'
  >,
  'box_data' | 'items_data' | 'personalization_data'
> & {
  box_data: unknown;
  items_data: unknown;
  personalization_data: unknown;
};

export function toSavedKitSnapshot(row: SavedKitSource) {
  // NULL means the historical draft had no selection, not an operational
  // zero-price product. Parse the complete arrays: a malformed entry is never
  // silently dropped. Passthrough keeps future/partial JSON metadata intact.
  const box = boxSnapshotSchema.nullable().safeParse(row.box_data);
  const items = z.array(itemSnapshotSchema).safeParse(row.items_data ?? []);
  const personalization = personalizationSnapshotSchema.safeParse(
    row.personalization_data ?? { box: { enabled: false }, items: {} },
  );
  if (!box.success || !items.success || !personalization.success) return null;
  const kitType: KitType =
    row.kit_type === 'original' || row.kit_type === 'simples' ? row.kit_type : 'montado';
  return {
    name: row.name || '',
    kitType,
    box: box.data,
    items: items.data,
    personalization: personalization.data,
    quoteClient: readDraftClient(personalization.data),
    notes: readDraftNotes(personalization.data),
    flow: readDraftFlow(personalization.data),
    aiBriefing: readDraftAIBriefing(personalization.data),
    kitQuantity:
      typeof row.kit_quantity === 'number' &&
      Number.isFinite(row.kit_quantity) &&
      row.kit_quantity > 0
        ? row.kit_quantity
        : 1,
    identity: {
      color: row.color || '#3B82F6',
      icon: row.icon || 'Package',
      tag: row.tag || '',
      description: row.description || '',
      isFavorite: row.is_favorite ?? false,
    } satisfies KitIdentity,
  };
}
