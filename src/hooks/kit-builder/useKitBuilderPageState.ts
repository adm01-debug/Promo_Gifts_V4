import { toSavedKitSnapshot } from '@/lib/kit-builder/snapshot/read-draft';
export { toSavedKitSnapshot } from '@/lib/kit-builder/snapshot/read-draft';
import { useAuth } from '@/contexts/AuthContext';
import { dbInvoke } from '@/lib/db/postgrest';
import { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  transformToKitItem,
  useCustomKitPersistence,
  useCustomKitsRealtime,
  useDuplicateKitDetector,
  useKitAutoSave,
  useKitBuilder,
  useKitUndoRedo,
  useTemplateSnapshot,
  type BackupFullState,
} from '@/hooks/kit-builder';
import { useKitBuilderQuote, type KitQuoteClient } from '@/pages/kit-builder/useKitBuilderQuote';
import {
  calculateTotalKitPrice,
  type ExternalProductForKit,
  type KitAISuggestionBrief,
  type KitAIComposition,
} from '@/lib/kit-builder';
import type { KitOrigin } from '@/lib/kit-builder/types';
import { logger } from '@/lib/logger';
import { OCCASIONS, type Occasion } from '@/components/kit-builder/KitOccasionSelector';

export function isKitMakerLandingRoute(
  kitIdParam: string | null,
  productIdParam: string | null,
): boolean {
  return !kitIdParam && !productIdParam;
}

export function useKitBuilderPageState() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const kitIdParam = searchParams.get('kit');
  const productIdParam = searchParams.get('product');
  const originParam = searchParams.get('origin');
  const initialFlow =
    searchParams.get('flow') === 'items' || productIdParam ? 'items-first' : 'box-first';

  const [currentKitId, setCurrentKitId] = useState<string | undefined>(kitIdParam || undefined);
  const [currentRevision, setCurrentRevision] = useState<number | null>(null);
  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [quoteClient, setQuoteClient] = useState<KitQuoteClient>({});
  const [aiBriefing, setAIBriefing] = useState<KitAISuggestionBrief | undefined>();
  const [isLanding, setIsLanding] = useState(isKitMakerLandingRoute(kitIdParam, productIdParam));
  const [quantityNeedsConfirmation, setQuantityNeedsConfirmation] = useState(false);
  const [hydrationError, setHydrationError] = useState<string | null>(null);
  const [hydratedScope, setHydratedScope] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(Boolean(kitIdParam));
  const hydratedKitIdRef = useRef<string | null>(null);

  useEffect(() => {
    setIsLanding(isKitMakerLandingRoute(kitIdParam, productIdParam));
  }, [kitIdParam, productIdParam]);

  const {
    kitState,
    wizardState,
    kitQuantity,
    availableBoxes,
    availableItems,
    allAvailableBoxes,
    allAvailableItems,
    isLoadingBoxes,
    isLoadingItems,
    boxError,
    itemError,
    refetchBoxes,
    refetchItems,
    boxFilters,
    itemFilters,
    setBoxFilters,
    setItemFilters,
    setKitName,
    selectBox,
    clearBox,
    addItem,
    removeItem,
    clearItems,
    updateItemQuantity,
    updateItemVariant,
    reorderItems,
    setItemPersonalization,
    setBoxPersonalization,
    setKitQuantity: updateKitQuantity,
    setIdentity,
    setNotes,
    goToStep,
    nextStep,
    prevStep,
    resetKit,
    restoreKitSnapshot,
    applyAIComposition,
    setKitType,
    setKitOrigin,
    loadKit,
    startNewFlow,
  } = useKitBuilder({ initialFlow });

  const setKitQuantity = useCallback(
    (quantity: Parameters<typeof updateKitQuantity>[0]) => {
      if (!Number.isSafeInteger(quantity) || quantity < 1) {
        toast.error('Informe uma quantidade inteira maior que zero.');
        return;
      }
      updateKitQuantity(quantity);
      setQuantityNeedsConfirmation(false);
    },
    [updateKitQuantity],
  );

  const { isSaving, saveKit, savedKits, isLoadingKits } = useCustomKitPersistence();
  useCustomKitsRealtime();
  useTemplateSnapshot();
  const { handleAddToQuote: createQuote, isCreatingQuote } = useKitBuilderQuote();
  const {
    lastSavedAt,
    isSaving: isAutoSaving,
    autoSavedKitId,
    autoSaveError,
    isConflictError,
    retryLastSave,
    cancelPendingSave,
    acknowledgeManualSave,
    consumeUnloadBackup,
    persistUnloadBackup,
  } = useKitAutoSave(
    kitState,
    kitQuantity,
    currentKitId,
    currentRevision,
    (id, revision) => {
      setCurrentKitId(id);
      setCurrentRevision(revision);
    },
    !isHydrating &&
      !hydrationError &&
      !quantityNeedsConfirmation &&
      (!kitIdParam || hydratedScope === `${user?.id ?? 'anonymous'}:${kitIdParam}`),
    { quoteClient, flow: wizardState.flow, aiBriefing },
  );
  const {
    pushSnapshot,
    undo: undoSnapshot,
    redo: redoSnapshot,
    canUndo,
    canRedo,
    isRestoring,
  } = useKitUndoRedo();
  useDuplicateKitDetector();

  useEffect(() => {
    if (isHydrating || isRestoring.current) return;
    pushSnapshot({
      name: kitState.name,
      kitType: kitState.kitType,
      box: kitState.box,
      items: kitState.items,
      personalization: kitState.personalization,
      kitQuantity,
      identity: kitState.identity,
      notes: kitState.notes,
      flow: wizardState.flow,
      aiBriefing,
    });
  }, [
    kitState.name,
    kitState.kitType,
    kitState.box,
    kitState.items,
    kitState.personalization,
    kitState.identity,
    kitState.notes,
    kitQuantity,
    wizardState.flow,
    aiBriefing,
    pushSnapshot,
    isRestoring,
    isHydrating,
  ]);

  const undo = useCallback(() => {
    const snap = undoSnapshot();
    if (snap) {
      restoreKitSnapshot(snap);
      setAIBriefing(snap.aiBriefing);
    }
  }, [undoSnapshot, restoreKitSnapshot]);

  const redo = useCallback(() => {
    const snap = redoSnapshot();
    if (snap) {
      restoreKitSnapshot(snap);
      setAIBriefing(snap.aiBriefing);
    }
  }, [redoSnapshot, restoreKitSnapshot]);

  useEffect(() => {
    if (!kitIdParam) {
      // Saiu de /montar-kit?kit=X para /montar-kit sem remontar: limpa o estado da
      // hidratação anterior, senão salvar/autosave seguem bloqueados até recarregar.
      setIsHydrating(false);
      setHydrationError(null);
      setQuantityNeedsConfirmation(false);
      setHydratedScope(null);
      hydratedKitIdRef.current = null;
      return;
    }
    const scope = `${user?.id ?? 'anonymous'}:${kitIdParam}`;
    if (hydratedKitIdRef.current === scope) return;
    setIsHydrating(true);
    if (isLoadingKits || !user?.id) return;

    const row = savedKits.find((kit) => kit.id === kitIdParam);
    hydratedKitIdRef.current = scope;
    if (!row) {
      logger.warn('[kit-builder] Saved kit was not found or is no longer accessible:', kitIdParam);
      setHydrationError('Não foi possível abrir este kit salvo.');
      toast.error('Não foi possível abrir este kit salvo.');
      setIsHydrating(false);
      return;
    }

    const snapshot = toSavedKitSnapshot(row);
    if (!snapshot) {
      logger.warn('[kit-builder] Invalid saved kit snapshot:', kitIdParam);
      setHydrationError(
        'O rascunho contém campos incompletos ou inválidos. Revise o kit na biblioteca antes de salvar.',
      );
      toast.error('O rascunho do kit está em um formato inválido.');
      setIsHydrating(false);
      return;
    }

    loadKit(snapshot);
    setQuoteClient(snapshot.quoteClient);
    setAIBriefing(snapshot.aiBriefing);
    setCurrentKitId(row.id);
    setCurrentRevision(row.revision);
    setQuantityNeedsConfirmation(
      typeof row.kit_quantity !== 'number' ||
        !Number.isSafeInteger(row.kit_quantity) ||
        row.kit_quantity < 1,
    );
    setHydratedScope(scope);
    setHydrationError(null);
    if (originParam === 'manual' || originParam === 'template' || originParam === 'ai') {
      setKitOrigin(originParam);
    }
    setIsHydrating(false);
  }, [isLoadingKits, kitIdParam, user?.id, loadKit, originParam, savedKits, setKitOrigin]);

  useEffect(() => {
    if (productIdParam && !kitIdParam) {
      (async () => {
        try {
          const result = await dbInvoke<ExternalProductForKit>({
            table: 'products',
            operation: 'select',
            filters: { id: productIdParam },
            limit: 1,
          });
          if (result.records?.length > 0) {
            const kitItem = transformToKitItem(result.records[0]);
            if (!kitItem) {
              toast.error('Este produto não possui preço comercial disponível para o kit.');
              return;
            }
            addItem(kitItem);
            setKitName(result.records[0].name || '');
          }
        } catch (err) {
          logger.warn('[kit-builder] Failed to load product:', err);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productIdParam, kitIdParam]);

  useEffect(() => {
    if (
      kitState.isValid &&
      kitState.items.length > 0 &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.85, x: 0.5 },
        colors: [kitState.identity?.color || '#3B82F6'],
      });
    }
  }, [kitState.identity?.color, kitState.isValid, kitState.items.length]);

  const pricing = calculateTotalKitPrice(
    kitState.box,
    kitState.items,
    kitState.personalization,
    kitQuantity,
  );

  const handleSaveKit = useCallback(async () => {
    if (quantityNeedsConfirmation) {
      toast.error('Defina a quantidade do rascunho antes de salvar ou criar um orçamento.');
      return;
    }
    if (
      isHydrating ||
      hydrationError ||
      (kitIdParam && hydratedScope !== `${user?.id ?? 'anonymous'}:${kitIdParam}`)
    ) {
      toast.error(hydrationError ?? 'Aguarde o carregamento do kit salvo.');
      return;
    }
    if (!kitState.box && kitState.items.length === 0) {
      toast.error('Adicione uma caixa ou item antes de salvar o kit.');
      return;
    }
    if (isAutoSaving) {
      toast.info(
        'O salvamento automático está em andamento. Aguarde a confirmação antes de salvar novamente.',
      );
      return;
    }
    cancelPendingSave();
    try {
      const kitId = currentKitId || autoSavedKitId || undefined;
      const saved = await saveKit(kitState, kitQuantity, kitId, kitId ? currentRevision : null, {
        quoteClient,
        flow: wizardState.flow,
        aiBriefing,
      });
      acknowledgeManualSave(saved.id, saved.revision);
      setCurrentKitId(saved.id);
      setCurrentRevision(saved.revision);
    } catch (error) {
      logger.warn('[kit-builder] Manual save failed:', error);
    }
  }, [
    autoSavedKitId,
    quantityNeedsConfirmation,
    isHydrating,
    hydrationError,
    kitIdParam,
    hydratedScope,
    user?.id,
    acknowledgeManualSave,
    cancelPendingSave,
    currentKitId,
    currentRevision,
    isAutoSaving,
    kitQuantity,
    kitState,
    quoteClient,
    wizardState.flow,
    aiBriefing,
    saveKit,
  ]);

  const handleAddToQuote = useCallback(
    async (...args: Parameters<typeof createQuote>) => {
      if (quantityNeedsConfirmation) {
        toast.error('Defina a quantidade do rascunho antes de salvar ou criar um orçamento.');
        return;
      }
      if (
        isHydrating ||
        hydrationError ||
        (kitIdParam && hydratedScope !== `${user?.id ?? 'anonymous'}:${kitIdParam}`)
      ) {
        toast.error(hydrationError ?? 'Aguarde o carregamento do kit salvo.');
        return;
      }
      return createQuote(...args);
    },
    [
      createQuote,
      quantityNeedsConfirmation,
      isHydrating,
      hydrationError,
      kitIdParam,
      hydratedScope,
      user?.id,
    ],
  );

  const applyAISuggestion = useCallback(
    (
      suggestion: KitAISuggestionBrief,
      composition: KitAIComposition,
      requestedQuantity?: number,
    ) => {
      applyAIComposition(composition, requestedQuantity);
      if (
        typeof requestedQuantity === 'number' &&
        Number.isSafeInteger(requestedQuantity) &&
        requestedQuantity > 0
      ) {
        setQuantityNeedsConfirmation(false);
      }
      setAIBriefing(suggestion);
      toast.success('Composição da IA aplicada', {
        description: 'Confira variantes, estoque, personalização e valores antes de continuar.',
      });
    },
    [applyAIComposition],
  );

  const startFlow = useCallback(
    (flow: 'box-first' | 'items-first', origin?: KitOrigin) => {
      startNewFlow(flow, origin);
      setQuoteClient({});
      setAIBriefing(undefined);
      setIsLanding(false);
    },
    [startNewFlow],
  );

  const selectOccasion = useCallback(
    (nextOccasion: Occasion | null) => {
      setOccasion(nextOccasion);
      if (!nextOccasion) return;

      const metadata = OCCASIONS.find((item) => item.id === nextOccasion);
      if (!metadata) return;

      setKitType(metadata.suggestedKitType);
      setItemFilters({ ...itemFilters, search: metadata.itemKeywords[0] });
      setBoxFilters({ ...boxFilters, search: metadata.boxKeywords[0] });
    },
    [boxFilters, itemFilters, setBoxFilters, setItemFilters, setKitType],
  );

  const resetKitAndQuoteClient = useCallback(() => {
    resetKit();
    setQuoteClient({});
    setAIBriefing(undefined);
    setOccasion(null);
  }, [resetKit]);

  const restoreFromBackup = useCallback(
    // `flowOverride`: quem acabou de chamar startFlow() no mesmo tick passa o fluxo novo,
    // porque wizardState.flow desta closure ainda é o anterior (evita flow 'box-first' + passo 'items').
    (fullState: BackupFullState, flowOverride?: 'box-first' | 'items-first') => {
      restoreKitSnapshot({
        name: fullState.name,
        kitType: fullState.kitType,
        box: fullState.box,
        items: fullState.items,
        personalization: fullState.personalization,
        kitQuantity: fullState.qty,
        identity: fullState.identity ?? undefined,
        notes: fullState.notes,
        flow: flowOverride ?? wizardState.flow,
        aiBriefing,
      });
      setKitQuantity(fullState.qty);
    },
    [restoreKitSnapshot, setKitQuantity, wizardState.flow, aiBriefing],
  );

  return {
    state: {
      kitState,
      wizardState,
      kitQuantity,
      currentKitId,
      currentRevision,
      autoSavedKitId,
      availableBoxes,
      allAvailableBoxes,
      availableItems,
      allAvailableItems,
      isLoadingBoxes,
      isLoadingItems,
      boxError,
      itemError,
      refetchBoxes,
      refetchItems,
      isHydrating,
      hydrationError,
      quantityNeedsConfirmation,
      isLanding,
      boxFilters,
      itemFilters,
      setBoxFilters,
      setItemFilters,
      occasion,
      setOccasion,
      quoteClient,
      setQuoteClient,
      aiBriefing,
    },
    actions: {
      setKitName,
      selectBox,
      clearBox,
      addItem,
      removeItem,
      clearItems,
      updateItemQuantity,
      updateItemVariant,
      reorderItems,
      setItemPersonalization,
      setBoxPersonalization,
      setKitQuantity,
      setIdentity,
      setNotes,
      goToStep,
      nextStep,
      prevStep,
      resetKit: resetKitAndQuoteClient,
      selectOccasion,
      undo,
      redo,
      canUndo,
      canRedo,
      handleSaveKit,
      retryAutoSave: retryLastSave,
      handleAddToQuote,
      applyAISuggestion,
      startFlow,
      setKitOrigin,
      consumeUnloadBackup,
      persistUnloadBackup,
      restoreFromBackup,
    },
    meta: {
      isSaving,
      isAutoSaving,
      isCreatingQuote,
      lastSavedAt,
      autoSaveError,
      isConflictError,
      pricing,
    },
  };
}
