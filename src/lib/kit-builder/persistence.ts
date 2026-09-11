import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';
import type { KitState } from './types';

export type PersistedCustomKit = Database['public']['Tables']['custom_kits']['Row'];

/**
 * The status trigger on `custom_kits` accepts the lifecycle vocabulary
 * draft/ready/shared/archived. Keeping the mapping here prevents manual save
 * and autosave from drifting into invalid values.
 */
export function getPersistedKitStatus(kitState: KitState): 'draft' | 'ready' {
  return kitState.isValid ? 'ready' : 'draft';
}

/**
 * Builds the shared snapshot persisted by both explicit save and autosave.
 * `totalPrice` is already the total for `kitQuantity`.
 */
export function buildKitPersistencePayload(
  userId: string,
  kitState: KitState,
  kitQuantity: number,
) {
  const identity = kitState.identity;

  return {
    user_id: userId,
    name: kitState.name || 'Kit sem nome',
    status: getPersistedKitStatus(kitState),
    kit_type: kitState.kitType || 'montado',
    box_data: kitState.box ? (structuredClone(kitState.box) as unknown as Json) : null,
    items_data: structuredClone(kitState.items) as unknown as Json,
    personalization_data: structuredClone(kitState.personalization) as unknown as Json,
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
    p_kit_id: (kitId ?? null) as unknown as string,
    p_expected_revision: (kitId ? expectedRevision : null) as unknown as number,
    p_payload: payload as unknown as Json,
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
