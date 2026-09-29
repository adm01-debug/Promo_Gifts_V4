import {
  isValidMagazinePageOrder,
  magazineClientBrandingSchema,
  magazineContentSettingsSchema,
  type MagazineTemplateId,
} from '@/types/magazine';
import type { EditorPatch } from './editorPersistence';

const PREFIX = 'magazine:editor-recovery:v1';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1_000;
const MAX_RECORD_BYTES = 256_000;
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
}

function key(userId: string, magazineId: string): string {
  return `${PREFIX}:${encodeURIComponent(userId)}:${encodeURIComponent(magazineId)}`;
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

export function readMagazineEditorRecovery(
  userId: string,
  magazineId: string,
  storage: Storage = window.localStorage,
): MagazineEditorRecovery | null {
  const storageKey = key(userId, magazineId);
  const removeInvalid = () => {
    try {
      storage.removeItem(storageKey);
    } catch {
      // Storage pode bloquear leitura e remoção (modo privado/policy do browser).
    }
  };
  try {
    const raw = storage.getItem(storageKey);
    if (!raw || raw.length > MAX_RECORD_BYTES) return null;
    const record = JSON.parse(raw) as Partial<MagazineEditorRecovery>;
    const savedAt = Date.parse(record.savedAt ?? '');
    if (
      !Number.isFinite(savedAt) ||
      Date.now() - savedAt > MAX_AGE_MS ||
      !Number.isSafeInteger(record.baseEditVersion) ||
      (record.baseEditVersion ?? -1) < 0 ||
      !validPatch(record.patch)
    ) {
      removeInvalid();
      return null;
    }
    return record as MagazineEditorRecovery;
  } catch {
    removeInvalid();
    return null;
  }
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
    const serialized = JSON.stringify({
      savedAt: new Date().toISOString(),
      baseEditVersion,
      patch,
      writerId,
    });
    if (serialized.length <= MAX_RECORD_BYTES) storage.setItem(key(userId, magazineId), serialized);
  } catch {
    // Armazenamento local é uma proteção best-effort; persistência canônica continua no servidor.
  }
}

export function clearMagazineEditorRecovery(
  userId: string,
  magazineId: string,
  storage: Storage = window.localStorage,
  expectedWriterId?: string,
): void {
  try {
    if (expectedWriterId) {
      const raw = storage.getItem(key(userId, magazineId));
      if (!raw) return;
      const record = JSON.parse(raw) as Partial<MagazineEditorRecovery>;
      if (record.writerId !== expectedWriterId) return;
    }
    storage.removeItem(key(userId, magazineId));
  } catch {
    // Sem ação: storage pode estar indisponível em modo privado.
  }
}
