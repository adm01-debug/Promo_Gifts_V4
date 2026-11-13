/**
 * buildCustomKitInsert — Helper tipado para construir payloads de insert/update em custom_kits.
 * Remove a necessidade de `as never` em chamadas Supabase.
 */
import { serializeJsonValue } from '@/lib/json-value';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

type KitInsertFields =
  | 'box_data' | 'box_price' | 'color' | 'description' | 'icon'
  | 'is_favorite' | 'is_pinned' | 'items_data' | 'items_price'
  | 'kit_quantity' | 'kit_type' | 'last_used_at' | 'name'
  | 'personalization_data' | 'personalization_price' | 'status' | 'tag'
  | 'total_price' | 'user_id' | 'volume_usage_percent';

// Both the legacy DTO and the typed database row provide these fields. No
// unused id/revision/timestamps are required merely to duplicate a draft.
type KitInsertSource = Omit<Pick<Tables<'custom_kits'>, KitInsertFields>,
  'box_data' | 'items_data' | 'personalization_data'> & {
  box_data: unknown;
  items_data: unknown;
  personalization_data: unknown;
};
export type CustomKitInsertPayload = TablesInsert<'custom_kits'>;

export function buildCustomKitInsert(
  source: KitInsertSource,
  overrides: Partial<CustomKitInsertPayload> & { user_id: string },
): CustomKitInsertPayload {
  return {
    user_id: overrides.user_id,
    name: overrides.name !== undefined ? overrides.name : source.name,
    status: overrides.status !== undefined ? overrides.status : source.status,
    kit_type: overrides.kit_type !== undefined ? overrides.kit_type : source.kit_type,
    box_data: serializeJsonValue(overrides.box_data !== undefined ? overrides.box_data : source.box_data) ?? null,
    items_data: serializeJsonValue(overrides.items_data !== undefined ? overrides.items_data : source.items_data) ?? null,
    personalization_data: serializeJsonValue(overrides.personalization_data !== undefined ? overrides.personalization_data : source.personalization_data) ?? null,
    kit_quantity: overrides.kit_quantity !== undefined ? overrides.kit_quantity : source.kit_quantity,
    box_price: overrides.box_price !== undefined ? overrides.box_price : source.box_price,
    items_price: overrides.items_price !== undefined ? overrides.items_price : source.items_price,
    personalization_price: overrides.personalization_price !== undefined ? overrides.personalization_price : source.personalization_price,
    total_price: overrides.total_price !== undefined ? overrides.total_price : source.total_price,
    volume_usage_percent: overrides.volume_usage_percent !== undefined ? overrides.volume_usage_percent : source.volume_usage_percent,
    color: overrides.color !== undefined ? overrides.color : source.color,
    icon: overrides.icon !== undefined ? overrides.icon : source.icon,
    tag: overrides.tag !== undefined ? overrides.tag : source.tag,
    description: overrides.description !== undefined ? overrides.description : source.description,
    is_favorite: overrides.is_favorite ?? source.is_favorite,
    is_pinned: overrides.is_pinned ?? source.is_pinned ?? false,
    last_used_at: overrides.last_used_at !== undefined ? overrides.last_used_at : source.last_used_at,
  };
}
