import { serializeJsonValue } from '@/lib/json-value';
import { hasKnownKitPrices, KIT_UNKNOWN_PRICE_MESSAGE } from './pricing-availability';
import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';
import type { KitAISuggestionBrief, KitBuilderFlow, KitState } from './types';

export type PersistedCustomKit = Database['public']['Tables']['custom_kits']['Row'];

export interface KitDraftClient {
  client_cnpj?: string;
  client_company?: string;
  client_email?: string;
  client_id?: string;
  client_name?: string;
  client_phone?: string;
}

export interface KitDraftContext {
  quoteClient?: KitDraftClient;
  /** Journey cannot be inferred safely from the current wizard step. */
  flow?: KitBuilderFlow;
  /** Structured IA constraints only; never chat history, secrets or credentials. */
  aiBriefing?: KitAISuggestionBrief;
}

/**
 * The status trigger on `custom_kits` accepts the lifecycle vocabulary
 * draft/ready/shared/archived. Keeping the mapping here prevents manual save
 * and autosave from drifting into invalid values.
 */
export function getPersistedKitStatus(kitState: KitState): 'draft' | 'ready' {
  return kitState.isValid ? 'ready' : 'draft';
}

/** Selo exibido na biblioteca: só published/shared são "Publicado"; `ready` é apenas válido. */
export function getKitStatusBadge(status: string): string {
  if (status === 'draft') return 'Rascunho';
  if (status === 'archived') return 'Arquivado';
  if (status === 'ready') return 'Pronto';
  return 'Publicado';
}

const CLIENT_FIELDS = new Set([
  'client_cnpj',
  'client_company',
  'client_email',
  'client_id',
  'client_name',
  'client_phone',
]);
const BRIEF_FIELDS = new Set([
  'kit_type',
  'box_keywords',
  'item_keywords',
  'target_price_brl',
  'narrative',
  'title',
  'description',
  'style_tag',
]);
const BUDGET_FIELDS = new Set(['min', 'max']);

function isDraftRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function draftExtras(value: unknown, knownFields: ReadonlySet<string>): Record<string, unknown> {
  if (!isDraftRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key]) => !knownFields.has(key)));
}

function mergeDraftClient(previous: unknown, next: KitDraftClient) {
  // Empty is an explicit clear. A different client must not inherit another
  // client's unknown metadata; same-client edits retain extensible fields.
  if (Object.keys(next).length === 0) return {};
  const oldClient = isDraftRecord(previous) ? previous : {};
  const oldIdentity = oldClient.client_id ?? oldClient.client_cnpj;
  const nextIdentity = next.client_id ?? next.client_cnpj;
  return {
    ...(oldIdentity === nextIdentity ? draftExtras(oldClient, CLIENT_FIELDS) : {}),
    ...structuredClone(next),
  };
}

function mergeDraftBrief(previous: unknown, next: KitAISuggestionBrief) {
  const oldBrief = isDraftRecord(previous) ? previous : {};
  return {
    ...draftExtras(oldBrief, BRIEF_FIELDS),
    ...structuredClone(next),
    target_price_brl: {
      ...draftExtras(oldBrief.target_price_brl, BUDGET_FIELDS),
      ...structuredClone(next.target_price_brl),
    },
  };
}

/**
 * Builds the shared snapshot persisted by both explicit save and autosave.
 * `totalPrice` is already the total for `kitQuantity`.
 */
export function buildKitPersistencePayload(
  userId: string,
  kitState: KitState,
  kitQuantity: number,
  context: KitDraftContext = {},
) {
  if (!hasKnownKitPrices(kitState)) throw new Error(KIT_UNKNOWN_PRICE_MESSAGE);
  const identity = kitState.identity;
  const personalization: unknown = kitState.personalization;
  const rawDraft =
    typeof personalization === 'object' && personalization !== null && '__draft' in personalization
      ? personalization.__draft
      : undefined;
  if (
    rawDraft !== undefined &&
    rawDraft !== null &&
    (typeof rawDraft !== 'object' || Array.isArray(rawDraft))
  ) {
    throw new Error(
      'O formato dos dados deste rascunho não é suportado. Os dados originais foram preservados.',
    );
  }
  const existingDraft =
    typeof rawDraft === 'object' && rawDraft !== null && !Array.isArray(rawDraft) ? rawDraft : {};
  if ('version' in existingDraft && existingDraft.version !== 1) {
    throw new Error(
      'A versão dos dados deste rascunho não é suportada. Os dados originais foram preservados.',
    );
  }
  const personalizationData = {
    ...structuredClone(kitState.personalization),
    __draft: {
      ...structuredClone(existingDraft),
      version: 1,
      ...(context.quoteClient !== undefined
        ? {
            quoteClient: mergeDraftClient(
              'quoteClient' in existingDraft ? existingDraft.quoteClient : undefined,
              context.quoteClient,
            ),
          }
        : {}),
      ...(kitState.notes !== undefined ? { notes: kitState.notes } : {}),
      ...(context.flow !== undefined ? { flow: context.flow } : {}),
      ...(context.aiBriefing !== undefined
        ? {
            aiBriefing: mergeDraftBrief(
              'aiBriefing' in existingDraft ? existingDraft.aiBriefing : undefined,
              context.aiBriefing,
            ),
          }
        : {}),
    },
  };

  return {
    user_id: userId,
    name: kitState.name || 'Kit sem nome',
    status: getPersistedKitStatus(kitState),
    kit_type: kitState.kitType || 'montado',
    box_data: kitState.box ? (serializeJsonValue(kitState.box) ?? null) : null,
    items_data: serializeJsonValue(kitState.items) ?? [],
    personalization_data: serializeJsonValue(personalizationData) ?? {},
    kit_quantity: kitQuantity,
    box_price: kitState.boxPrice,
    items_price: kitState.itemsPrice,
    personalization_price: kitState.personalizationPrice,
    total_price: kitState.totalPrice,
    volume_usage_percent: kitState.volumeUsagePercent,
    color: identity?.color ?? '#3B82F6',
    icon: identity?.icon ?? 'Package',
    tag: identity?.tag ?? null,
    description: identity?.description ?? null,
    is_favorite: identity?.isFavorite ?? false,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Persists one logical save through the canonical optimistic-locking RPC.
 * The request id is created once by the caller-facing operation, so a transport
 * retry can reuse it without creating a second kit.
 */
export async function persistCustomKitAtomically({
  kitId,
  expectedRevision,
  payload,
  requestId = globalThis.crypto.randomUUID(),
}: {
  kitId?: string;
  expectedRevision?: number | null;
  payload: ReturnType<typeof buildKitPersistencePayload>;
  requestId?: string;
}): Promise<PersistedCustomKit> {
  if (kitId && (!Number.isInteger(expectedRevision) || Number(expectedRevision) < 0)) {
    throw new Error('A revisão atual do kit é obrigatória para salvar alterações.');
  }

  const { data, error } = await supabase.rpc('save_custom_kit_atomic', {
    p_request_id: requestId,
    p_kit_id: (kitId ?? null)!, // nullable em PG; PostgREST não modela nullability
    p_expected_revision: (kitId ? expectedRevision : null)!, // idem
    p_payload: payload as Json,
  });

  if (error) throw error;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('O banco não retornou o kit salvo.');
  }

  const row = data as unknown as PersistedCustomKit;
  if (typeof row.id !== 'string' || !Number.isInteger(row.revision)) {
    throw new Error('O banco retornou uma revisão de kit inválida.');
  }
  return row;
}
