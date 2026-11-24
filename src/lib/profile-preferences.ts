/**
 * Atualização parcial de `profiles.preferences`.
 *
 * `preferences` é um JSON único compartilhado por vários hooks: quando cada um
 * grava o objeto inteiro, duas abas (ou dois hooks) sobrescrevem um ao outro e
 * a preferência do usuário reverte sozinha. Aqui só as chaves pedidas são
 * mescladas sobre o valor lido e o resultado é conferido por releitura com nova
 * tentativa — escritas do mesmo contexto são serializadas e as de outra aba
 * convergem sem perder chaves diferentes.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

const MAX_ATTEMPTS = 4;

type JsonObject = Record<string, Json>;

/** Valores aceitos pela coluna `jsonb`: nada de `undefined`, `Date` ou função. */
export function isJsonValue(value: unknown): value is Json {
  if (value === null) return true;
  switch (typeof value) {
    case 'string':
    case 'number':
    case 'boolean':
      return true;
    case 'object':
      return Array.isArray(value) ? value.every((item) => isJsonValue(item)) : isJsonObject(value);
    default:
      return false;
  }
}

function isJsonObject(value: unknown): value is JsonObject {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value).every((item) => isJsonValue(item));
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => sameValue(item, b[index]));
  }
  if (isJsonObject(a) && isJsonObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    return keysA.length === keysB.length && keysA.every((key) => sameValue(a[key], b[key]));
  }
  return false;
}

/**
 * Serializa as gravações deste contexto: vários hooks gravam na mesma aba e,
 * sem a fila, todos leem o mesmo valor e o último sobrescreve o outro.
 */
let writeQueue: Promise<unknown> = Promise.resolve();

function enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readPreferences(userId: string): Promise<JsonObject> {
  const { data, error } = await supabase
    .from('profiles')
    .select('preferences')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return isJsonObject(data?.preferences) ? data.preferences : {};
}

function toJsonObject(patch: ProfilePreferences): JsonObject {
  const result: JsonObject = {};
  for (const [key, value] of Object.entries(patch)) {
    if (!isJsonValue(value)) {
      throw new Error(`A preferência "${key}" não pode ser gravada como JSON.`);
    }
    result[key] = value;
  }
  return result;
}

export type ProfilePreferences = Record<string, unknown>;

/**
 * Mescla `patch` em `profiles.preferences` do usuário sem apagar as outras chaves.
 * Lança quando não consegue confirmar a gravação depois de `MAX_ATTEMPTS` leituras.
 */
export function mergeProfilePreferences(userId: string, patch: ProfilePreferences): Promise<void> {
  const jsonPatch = toJsonObject(patch);
  const keys = Object.keys(jsonPatch);
  if (keys.length === 0) return Promise.resolve();
  return enqueueWrite(() => mergeWithRetry(userId, jsonPatch, keys));
}

async function mergeWithRetry(userId: string, patch: JsonObject, keys: string[]): Promise<void> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const current = await readPreferences(userId);
    if (keys.every((key) => sameValue(current[key], patch[key]))) return;

    const next: JsonObject = { ...current, ...patch };
    const { error } = await supabase
      .from('profiles')
      .update({ preferences: next })
      .eq('user_id', userId);
    if (error) throw error;

    const after = await readPreferences(userId);
    if (keys.every((key) => sameValue(after[key], patch[key]))) return;
  }

  throw new Error(
    'Outra sessão alterou suas preferências ao mesmo tempo. Tente novamente em instantes.',
  );
}
