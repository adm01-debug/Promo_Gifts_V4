/**
 * Kit Auto-Save Hook
 * Saves kit state automatically with debounce (5 seconds).
 * Only triggers after the user has made meaningful changes.
 *
 * BUG-11 FIX: usar refs para dependencias instaveis (kitState, kitQuantity,
 * onKitIdCreated) para que saveToDb nao seja recriado a cada render do pai.
 * Timer de 5s isolado de re-renders intermediarios.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { KitState } from '@/lib/kit-builder';
import { logger } from '@/lib/logger';
import {
  buildKitPersistencePayload,
  persistCustomKitAtomically,
} from '@/lib/kit-builder/persistence';

const AUTO_SAVE_DELAY_MS = 5000;

interface AutoSaveResult {
  lastSavedAt: Date | null;
  isSaving: boolean;
  autoSavedKitId: string | null;
  /** Cancels a debounced save before the explicit save action takes ownership. */
  cancelPendingSave: () => void;
}

export function useKitAutoSave(
  kitState: KitState,
  kitQuantity: number,
  currentKitId: string | undefined,
  currentRevision: number | null,
  onKitIdCreated?: (id: string, revision: number) => void,
  enabled = true,
): AutoSaveResult {
  const { user } = useAuth();
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSavedKitId, setAutoSavedKitId] = useState<string | null>(currentKitId || null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const snapshotRef = useRef<string>('');
  const isFirstRender = useRef(true);
  const wasEnabledRef = useRef(enabled);
  const saveInFlightRef = useRef(false);
  const saveQueuedRef = useRef(false);
  const saveToDbRef = useRef<(() => Promise<void>) | null>(null);

  /**
   * BUG-11 FIX: usar refs para dependencias instaveis.
   *
   * PROBLEMA ORIGINAL: `onKitIdCreated` (funcao inline do componente pai, nova referencia
   * a cada render) estava nas deps de `saveToDb` via useCallback. Isso recriava `saveToDb`
   * a cada render do pai -> o useEffect de snapshot incluia `saveToDb` nas deps -> seu cleanup
   * (`clearTimeout(timerRef.current)`) cancelava o timer de 5s antes de disparar -> o auto-save
   * nunca executava.
   *
   * SOLUCAO: todas as props instaveis lidas via refs. `saveToDb` tem deps estaveis
   * [user?.id, currentKitId] e nao precisa ser recriado a cada render.
   * O timer de 5s sobrevive a re-renders do componente pai.
   */
  const kitStateRef = useRef<KitState>(kitState);
  const kitQuantityRef = useRef<number>(kitQuantity);
  const onKitIdCreatedRef = useRef<((id: string, revision: number) => void) | undefined>(
    onKitIdCreated,
  );
  const autoSavedKitIdRef = useRef<string | null>(currentKitId || null);
  const revisionRef = useRef<number | null>(currentRevision);
  const enabledRef = useRef(enabled);

  // Manter refs sincronizadas a cada render -- sem useEffect para evitar batching delay
  kitStateRef.current = kitState;
  kitQuantityRef.current = kitQuantity;
  onKitIdCreatedRef.current = onKitIdCreated;
  enabledRef.current = enabled;

  // saveToDb usa apenas deps estaveis -- nao recria a cada mudanca de kitState/onKitIdCreated
  const saveToDb = useCallback(async () => {
    const currentKitState = kitStateRef.current;
    const currentKitQuantity = kitQuantityRef.current;
    const currentOnKitIdCreated = onKitIdCreatedRef.current;

    if (!user?.id || !enabledRef.current) return;

    // A slow network must not allow overlapping autosaves with the same
    // revision. Keep at most one trailing save, which always reads the newest
    // state from refs below.
    if (saveInFlightRef.current) {
      saveQueuedRef.current = true;
      return;
    }

    // Don't auto-save empty kits
    if (!currentKitState.box && currentKitState.items.length === 0) return;

    const payload = buildKitPersistencePayload(user.id, currentKitState, currentKitQuantity);

    saveInFlightRef.current = true;
    setIsSaving(true);
    try {
      const kitId = autoSavedKitIdRef.current || currentKitId;
      const data = await persistCustomKitAtomically({
        kitId: kitId ?? undefined,
        expectedRevision: kitId ? revisionRef.current : null,
        payload,
      });
      autoSavedKitIdRef.current = data.id;
      revisionRef.current = data.revision;
      setAutoSavedKitId(data.id);
      currentOnKitIdCreated?.(data.id, data.revision);
      setLastSavedAt(new Date());
    } catch (err) {
      logger.warn('[auto-save] Failed:', err);
    } finally {
      saveInFlightRef.current = false;
      setIsSaving(false);
      if (saveQueuedRef.current) {
        saveQueuedRef.current = false;
        queueMicrotask(() => {
          void saveToDbRef.current?.();
        });
      }
    }
  }, [user?.id, currentKitId]); // FIX: removidos kitState, kitQuantity, onKitIdCreated

  saveToDbRef.current = saveToDb;

  const cancelPendingSave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
    saveQueuedRef.current = false;
  }, []);

  // Snapshot effect: agenda o timer quando o estado muda de forma relevante
  useEffect(() => {
    const nextSnapshot = JSON.stringify({
      box: kitState.box?.id,
      items: kitState.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        selectedVariantId: item.selectedVariantId ?? null,
        selectedColor: item.selectedColor ?? null,
        selectedSize: item.selectedSize ?? null,
        sku: item.sku,
        price: item.price,
      })),
      personalization: kitState.personalization,
      name: kitState.name,
      kitType: kitState.kitType,
      identity: kitState.identity ?? null,
      qty: kitQuantity,
    });

    if (isFirstRender.current) {
      isFirstRender.current = false;
      snapshotRef.current = nextSnapshot;
      return;
    }

    // Hydrating a saved kit is not a user edit. Capture it as the new
    // baseline so an old/default snapshot cannot overwrite the remote draft.
    if (!enabled || !wasEnabledRef.current) {
      wasEnabledRef.current = enabled;
      snapshotRef.current = nextSnapshot;
      return;
    }

    if (nextSnapshot === snapshotRef.current) return;
    snapshotRef.current = nextSnapshot;

    // Cancela timer anterior (debounce) e reagenda
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(saveToDb, AUTO_SAVE_DELAY_MS);

    // NOTA: sem cleanup aqui -- o timer deve sobreviver a re-renders intermedios.
    // O cleanup de unmount e tratado pelo effect dedicado abaixo.
  }, [
    kitState.box?.id,
    kitState.items,
    kitState.personalization,
    kitState.name,
    kitState.kitType,
    kitState.identity,
    kitQuantity,
    saveToDb,
    enabled,
  ]);

  // Cleanup dedicado ao unmount -- cancela qualquer timer pendente
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Update autoSavedKitId when currentKitId changes externally
  useEffect(() => {
    if (currentKitId) {
      setAutoSavedKitId(currentKitId);
      autoSavedKitIdRef.current = currentKitId;
    }
  }, [currentKitId]);

  useEffect(() => {
    revisionRef.current = currentRevision;
  }, [currentRevision]);

  return { lastSavedAt, isSaving, autoSavedKitId, cancelPendingSave };
}
