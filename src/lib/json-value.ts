import type { Json } from '@/integrations/supabase/types';

function isJsonValue(value: unknown): value is Json {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value !== 'object') return false;
  return Object.values(value).every(isJsonValue);
}

export function serializeJsonValue(value: unknown): Json | undefined {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) return undefined;
  const parsed: unknown = JSON.parse(serialized);
  if (!isJsonValue(parsed)) throw new TypeError('Serialized value is not valid JSON.');
  return parsed;
}
