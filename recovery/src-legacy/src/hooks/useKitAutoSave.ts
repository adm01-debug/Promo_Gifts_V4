/**
 * Kit Auto-Save Hook
 * Saves kit state automatically with debounce (5 seconds).
 * Only triggers after the user has made meaningful changes.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { KitState } from '@/lib/kit-builder';
import { buildKitPersistencePayload } from '@/lib/kit-builder/persistence';
import { hasKnownKitPrices } from '@/lib/kit-builder/pricing-availability';
import { logger } from '@/lib/logger';

const AUTO_SAVE_DELAY_MS = 5000;

interface AutoSaveResult {
  lastSavedAt: Date | null;
  isSaving: boolean;
  autoSavedKitId: string | null;
}

export function useKitAutoSave(
  kitState: KitState,
  kitQuantity: number,
  currentKitId: string | undefined,
  onKitIdCreated?: (id: string) => void,
): AutoSaveResult {
  const { user } = useAuth();
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSavedKitId, setAutoSavedKitId] = useState<string | null>(currentKitId || null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const snapshotRef = useRef('');
  const mountedRef = useRef(false);
  const scopeVersionRef = useRef(0);
  const contextRef = useRef({ userId: user?.id, kitId: currentKitId });
  const contextInitializedRef = useRef(false);
  const inputsRef = useRef({ kitState, kitQuantity, onKitIdCreated });
  const autoSavedKitIdRef = useRef<string | null>(currentKitId || null);
  const inFlightRef = useRef<AbortController | null>(null);
  const queuedRef = useRef(false);
  const saveToDbRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      scopeVersionRef.current += 1;
      if (timerRef.current) clearTimeout(timerRef.current);
      inFlightRef.current?.abort();
    };
  }, []);

  // Callback identity changes update the eventual recipient without restarting
  // a pending debounce. Refs change only after the render has committed.
  useEffect(() => {
    inputsRef.current = { kitState, kitQuantity, onKitIdCreated };
  }, [kitState, kitQuantity, onKitIdCreated]);

  useEffect(() => {
    const previous = contextRef.current;
    contextRef.current = { userId: user?.id, kitId: currentKitId };
    const createdIdHandoff = contextInitializedRef.current && previous.userId === user?.id
      && !previous.kitId && !!currentKitId && currentKitId === autoSavedKitIdRef.current;
    if (createdIdHandoff) return;
    contextInitializedRef.current = true;
    scopeVersionRef.current += 1;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = undefined;
    inFlightRef.current?.abort();
    inFlightRef.current = null;
    queuedRef.current = false;
    autoSavedKitIdRef.current = currentKitId || null;
    setAutoSavedKitId(currentKitId || null);
    setIsSaving(false);
    setLastSavedAt(null);
    // Loading/switching a kit establishes a baseline, never an automatic write.
    try {
      snapshotRef.current = JSON.stringify({ kitState: inputsRef.current.kitState, qty: inputsRef.current.kitQuantity });
    } catch (error) {
      logger.warn('[auto-save] Invalid snapshot:', error);
    }
  }, [user?.id, currentKitId]);

  const saveToDb = useCallback(async () => {
    if (!mountedRef.current || !contextRef.current.userId) return;
    if (inFlightRef.current) {
      queuedRef.current = true;
      return;
    }
    const input = inputsRef.current;
    if (!input.kitState.box && input.kitState.items.length === 0) return;
    if (!hasKnownKitPrices(input.kitState)) return;
    const ownerId = contextRef.current.userId;
    const scope = scopeVersionRef.current;
    const kitId = autoSavedKitIdRef.current || contextRef.current.kitId;
    const submittedSnapshot = snapshotRef.current;
    const controller = new AbortController();
    inFlightRef.current = controller;
    setIsSaving(true);
    const isCurrent = () => mountedRef.current && scopeVersionRef.current === scope && !controller.signal.aborted;
    try {
      const payload = {
        ...buildKitPersistencePayload(ownerId, input.kitState, input.kitQuantity),
        status: 'draft' as const,
      };
      if (kitId) {
        const { data, error } = await supabase.from('custom_kits').update(payload)
          .eq('id', kitId).eq('user_id', ownerId).select('id').abortSignal(controller.signal).maybeSingle();
        if (error) throw error;
        if (data?.id !== kitId) throw new Error('O banco não confirmou o kit atualizado.');
      } else {
        const { data, error } = await supabase.from('custom_kits').insert(payload)
          .select('id').abortSignal(controller.signal).single();
        if (error) throw error;
        if (!data || typeof data.id !== 'string' || !data.id) throw new Error('O banco não confirmou o novo kit.');
        if (!isCurrent()) return;
        autoSavedKitIdRef.current = data.id;
        setAutoSavedKitId(data.id);
        inputsRef.current.onKitIdCreated?.(data.id);
      }
      if (isCurrent()) setLastSavedAt(new Date());
    } catch (error) {
      if (isCurrent()) logger.warn('[auto-save] Failed:', error);
    } finally {
      if (isCurrent() && inFlightRef.current === controller) {
        inFlightRef.current = null;
        setIsSaving(false);
        const shouldSaveLatest = queuedRef.current && snapshotRef.current !== submittedSnapshot;
        queuedRef.current = false;
        if (shouldSaveLatest) void saveToDbRef.current?.();
      }
    }
  }, []);

  useEffect(() => { saveToDbRef.current = saveToDb; }, [saveToDb]);

  // Only meaningful data changes replace a scheduled save. Callback churn and
  // equivalent renders must not clear the timer before its five seconds elapse.
  useEffect(() => {
    let nextSnapshot: string;
    try {
      nextSnapshot = JSON.stringify({ kitState, qty: kitQuantity });
    } catch (error) {
      logger.warn('[auto-save] Invalid snapshot:', error);
      return;
    }
    if (nextSnapshot === snapshotRef.current) return;
    snapshotRef.current = nextSnapshot;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = undefined;
      void saveToDb();
    }, AUTO_SAVE_DELAY_MS);
  }, [kitState, kitQuantity, saveToDb]);

  return { lastSavedAt, isSaving, autoSavedKitId };
}
