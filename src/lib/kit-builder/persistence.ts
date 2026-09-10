import type { Json } from '@/integrations/supabase/types';
import type { KitState } from './types';

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
