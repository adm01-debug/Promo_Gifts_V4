import {
  isValidMagazinePageOrder,
  magazineClientBrandingSchema,
  magazineContentSettingsSchema,
  type MagazineTemplateId,
} from '@/types/magazine';
import type { EditorPatch } from './editorPersistence';

const PREFIX = 'magazine:editor-recovery:v2';
const LEGACY_PREFIX = 'magazine:editor-recovery:v1';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1_000;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1_000;
const MAX_RECORD_BYTES = 256_000;
const MAX_RECORDS = 8;
const TEMPLATE_IDS = new Set<MagazineTemplateId>([
  'catalog-giftset',
  'catalog-grid-2x3',
  'catalog-grid-3x3',
  'catalog-list',
  'corporate-executive',
  'corporate-hero',
  'corporate-split',
  'editorial-hero-grid',
  'editorial-magazine',
  'editorial-manifesto',
  'editorial-mono',
  'editorial-vogue',
]);

export interface MagazineEditorRecovery {
  savedAt: string;
  baseEditVersion: number;
  patch: EditorPatch;
  writerId?: string;
  /** All tabs represented in a merged recovery, for precise acknowledgement. */
  writerIds?: string[];
}

function keyPrefix(userId: string, magazineId: string): string {
  return `${PREFIX}:${encodeURIComponent(userId)}:${encodeURIComponent(magazineId)}`;
}

function writerKey(userId: string, magazineId: string, writerId: string): string {
  return `${keyPrefix(userId, magazineId)}:${encodeURIComponent(writerId)}`;
}

function legacyKey(userId: string, magazineId: string): string {
  return `${LEGACY_PREFIX}:${encodeURIComponent(userId)}:${encodeURIComponent(magazineId)}`;
}

function validPatch(value: unknown): value is EditorPatch {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const patch = value as Record<string, unknown>;
  const allowed = new Set(['branding', 'content', 'pageOrder', 'subtitle', 'templateId', 'title']);
  if (Object.keys(patch).some((field) => !allowed.has(field))) return false;
  if ('title' in patch && (typeof patch.title !== 'string' || patch.title.length > 200))
    return false;
  if ('subtitle' in patch && (typeof patch.subtitle !== 'string' || patch.subtitle.length > 300))
    return false;
  if (
    'templateId' in patch &&
    (typeof patch.templateId !== 'string' ||
      !TEMPLATE_IDS.has(patch.templateId as MagazineTemplateId))
  )
    return false;
  if ('branding' in patch && !magazineClientBrandingSchema.safeParse(patch.branding).success)
    return false;
  if ('content' in patch && !magazineContentSettingsSchema.safeParse(patch.content).success)
    return false;
  if ('pageOrder' in patch && !isValidMagazinePageOrder(patch.pageOrder)) return false;
  return Object.keys(patch).length > 0;
}

function parseRecord(value: unknown, now = Date.now()): MagazineEditorRecovery | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Partial<MagazineEditorRecovery>;
  const savedAt = Date.parse(record.savedAt ?? '');
  if (
    !Number.isFinite(savedAt) ||
    savedAt > now + MAX_FUTURE_SKEW_MS ||
    now - savedAt > MAX_AGE_MS ||
    !Number.isSafeInteger(record.baseEditVersion) ||
    (record.baseEditVersion ?? -1) < 0 ||
    !validPatch(record.patch)
  ) {
    return null;
  }
  if (
    record.writerId !== undefined &&
    (typeof record.writerId !== 'string' || record.writerId.length > 160)
  ) {
    return null;
  }
  return {
    savedAt: record.savedAt!,
    baseEditVersion: record.baseEditVersion!,
    patch: record.patch!,
    writerId: record.writerId,
  };
}

function readRecords(raw: string | null, now = Date.now()): MagazineEditorRecovery[] | null {
  if (!raw || raw.length > MAX_RECORD_BYTES) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'records' in parsed) {
      const records = (parsed as { records?: unknown }).records;
      if (!Array.isArray(records) || records.length === 0 || records.length > MAX_RECORDS)
        return null;
      const validated = records.map((record) => parseRecord(record, now));
      return validated.every(Boolean) ? (validated as MagazineEditorRecovery[]) : null;
    }
    const legacy = parseRecord(parsed, now);
    return legacy ? [legacy] : null;
  } catch {
    return null;
  }
}

function remove(storage: Storage, storageKey: string) {
  try {
    storage.removeItem(storageKey);
  } catch {
    // Storage pode bloquear leitura e remoção (modo privado/policy do browser).
  }
}

function v2Keys(userId: string, magazineId: string, storage: Storage): string[] {
  const prefix = keyPrefix(userId, magazineId);
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const storageKey = storage.key(index);
    if (storageKey === prefix || storageKey?.startsWith(`${prefix}:`)) keys.push(storageKey);
  }
  return keys;
}

function v2Records(userId: string, magazineId: string, storage: Storage): MagazineEditorRecovery[] {
  const records: MagazineEditorRecovery[] = [];
  for (const storageKey of v2Keys(userId, magazineId, storage)) {
    const raw = storage.getItem(storageKey);
    const parsed = readRecords(raw);
    if (!parsed) {
      if (raw) remove(storage, storageKey);
      continue;
    }
    records.push(...parsed);
  }
  return records;
}

function pruneV2Records(userId: string, magazineId: string, storage: Storage): void {
  const records = v2Records(userId, magazineId, storage).sort(
    (a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt),
  );
  if (records.length <= MAX_RECORDS) return;
  const retained = new Set(
    records.slice(0, MAX_RECORDS).map((record) => record.writerId ?? 'legacy'),
  );
  for (const storageKey of v2Keys(userId, magazineId, storage)) {
    const raw = storage.getItem(storageKey);
    const parsed = readRecords(raw);
    if (parsed?.every((record) => !retained.has(record.writerId ?? 'legacy')))
      remove(storage, storageKey);
  }
}

function mergedRecovery(records: MagazineEditorRecovery[]): MagazineEditorRecovery | null {
  if (records.length === 0) return null;
  const latest = [...records].sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt))[0];
  // Different server revisions must never be combined. Within the most recent
  // base revision, merge non-conflicting edits and let the newest edit win a
  // conflicting field. This retains independent offline work from two tabs.
  const compatible = records
    .filter((record) => record.baseEditVersion === latest.baseEditVersion)
    .sort((a, b) => Date.parse(a.savedAt) - Date.parse(b.savedAt));
  return {
    savedAt: latest.savedAt,
    baseEditVersion: latest.baseEditVersion,
    patch: compatible.reduce<EditorPatch>((patch, record) => ({ ...patch, ...record.patch }), {}),
    writerId: latest.writerId,
    writerIds: compatible.map((record) => record.writerId ?? 'legacy'),
  };
}

export function readMagazineEditorRecovery(
  userId: string,
  magazineId: string,
  storage: Storage = window.localStorage,
): MagazineEditorRecovery | null {
  const oldStorageKey = legacyKey(userId, magazineId);
  try {
    const records = v2Records(userId, magazineId, storage);
    if (records.length > 0) return mergedRecovery(records);

    const legacyRaw = storage.getItem(oldStorageKey);
    const legacyRecords = readRecords(legacyRaw);
    if (legacyRaw && !legacyRecords) remove(storage, oldStorageKey);
    return legacyRecords ? mergedRecovery(legacyRecords) : null;
  } catch {
    return null;
  }
}

function currentRecords(
  userId: string,
  magazineId: string,
  storage: Storage,
): MagazineEditorRecovery[] {
  const current = v2Records(userId, magazineId, storage);
  if (current.length > 0) return current;
  return readRecords(storage.getItem(legacyKey(userId, magazineId))) ?? [];
}

export function writeMagazineEditorRecovery(
  userId: string,
  magazineId: string,
  baseEditVersion: number,
  patch: EditorPatch,
  storage: Storage = window.localStorage,
  writerId = 'legacy',
): void {
  if (!validPatch(patch) || !Number.isSafeInteger(baseEditVersion) || baseEditVersion < 0) return;
  try {
    const record: MagazineEditorRecovery = {
      savedAt: new Date().toISOString(),
      baseEditVersion,
      patch,
      writerId,
    };
    const serialized = JSON.stringify(record);
    if (serialized.length > MAX_RECORD_BYTES) return;
    // A separate key per writer avoids a shared read-modify-write envelope:
    // independent browser tabs cannot overwrite each other's recovery patch.
    storage.setItem(writerKey(userId, magazineId, writerId), serialized);
    pruneV2Records(userId, magazineId, storage);
    remove(storage, legacyKey(userId, magazineId));
  } catch {
    // Armazenamento local é uma proteção best-effort; persistência canônica continua no servidor.
  }
}

export function clearMagazineEditorRecovery(
  userId: string,
  magazineId: string,
  storage: Storage = window.localStorage,
  expectedWriterId?: string[] | string,
): void {
  const oldStorageKey = legacyKey(userId, magazineId);
  try {
    if (!expectedWriterId) {
      for (const storageKey of v2Keys(userId, magazineId, storage)) storage.removeItem(storageKey);
      storage.removeItem(oldStorageKey);
      return;
    }
    const expected = new Set(
      Array.isArray(expectedWriterId) ? expectedWriterId : [expectedWriterId],
    );
    const records = currentRecords(userId, magazineId, storage);
    if (records.length === 0) return;
    const retained = records.filter((record) => !expected.has(record.writerId ?? 'legacy'));
    if (retained.length === records.length) return;
    if (retained.length === 0) {
      for (const storageKey of v2Keys(userId, magazineId, storage)) storage.removeItem(storageKey);
      storage.removeItem(oldStorageKey);
      return;
    }
    for (const storageKey of v2Keys(userId, magazineId, storage)) {
      const parsed = readRecords(storage.getItem(storageKey));
      if (parsed?.some((record) => expected.has(record.writerId ?? 'legacy'))) {
        remove(storage, storageKey);
      }
    }
    const legacy = readRecords(storage.getItem(oldStorageKey));
    if (legacy?.some((record) => expected.has(record.writerId ?? 'legacy')))
      remove(storage, oldStorageKey);
  } catch {
    // Sem ação: storage pode estar indisponível em modo privado.
  }
}
