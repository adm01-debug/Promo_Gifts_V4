import { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { toSavedKitSnapshot } from '@/hooks/kit-builder/useKitBuilderPageState';
import { useSearchParams } from 'react-router-dom';
import { useKitBuilder } from '@/hooks/useKitBuilder';
import { useCustomKitPersistence } from '@/hooks/kit-builder/useCustomKitPersistence';
import { useKitAutoSave } from '@/hooks/kit-builder/useKitAutoSave';
import { useKitUndoRedo } from '@/hooks/useKitUndoRedo';
import { useKitBuilderQuote, type KitQuoteClient } from '@/pages/kit-builder/useKitBuilderQuote';
import { useTemplateSnapshot } from '@/hooks/useTemplateSnapshot';
import { useDuplicateKitDetector } from '@/hooks/useDuplicateKitDetector';
import { transformToKitItem } from '@/hooks/useKitBuilderTransformers';
import { dbInvoke } from '@/lib/db/postgrest';
import { logger } from '@/lib/logger';
import { hasKnownKitPrice, hasKnownKitPrices, KIT_UNKNOWN_PRICE_MESSAGE } from '@/lib/kit-builder/pricing-availability';
import { calculateTotalKitPrice, type KitAIComposition, type KitAISuggestionBrief, type KitItem, type ExternalProductForKit } from '@/lib/kit-builder';

export function useKitBuilderPageState() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const kitIdParam = searchParams.get('kit');
  const productIdParam = searchParams.get('product');

  const [currentKitId, setCurrentKitId] = useState<string | undefined>(kitIdParam || undefined);
  const [currentRevision, setCurrentRevision] = useState<number | null>(null);
  const [quantityNeedsConfirmation, setQuantityNeedsConfirmation] = useState(false);
  const [isHydrating, setIsHydrating] = useState(Boolean(kitIdParam));
  const [hydratedScope, setHydratedScope] = useState<string | null>(null);
  const [hydrationError, setHydrationError] = useState<string | null>(null);
  const [quoteClient, setQuoteClient] = useState<KitQuoteClient>({});
  const [aiBriefing, setAIBriefing] = useState<KitAISuggestionBrief | undefined>();
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);
  const priceRefreshRequestRef = useRef(0);
  const priceRefreshMountedRef = useRef(false);
  const financialScope = `${user?.id ?? 'anonymous'}:${kitIdParam ?? ''}:${currentKitId ?? ''}`;
  const financialScopeRef = useRef(financialScope);
  useEffect(() => {
    priceRefreshMountedRef.current = true;
    return () => { priceRefreshMountedRef.current = false; priceRefreshRequestRef.current += 1; };
  }, []);
  useEffect(() => {
    if (financialScopeRef.current !== financialScope) {
      financialScopeRef.current = financialScope;
      priceRefreshRequestRef.current += 1;
      setIsRefreshingPrices(false);
    }
  }, [financialScope]);
  const hydratedKitRef = useRef<string | null>(null);
  const [occasion, setOccasion] = useState<string | null>(null);

  const {
    kitState,
    wizardState,
    kitQuantity,
    availableBoxes,
    availableItems,
    completeBoxCatalog,
    completeItemCatalog,
    boxQueryError,
    itemQueryError,
    refetchBoxes,
    refetchItems,
    isLoadingBoxes,
    isLoadingItems,
    boxFilters,
    itemFilters,
    setBoxFilters,
    setItemFilters,
    setKitName,
    selectBox,
    clearBox,
    addItem,
    removeItem,
    updateItemQuantity,
    updateItemVariant,
    reorderItems,
    setItemPersonalization,
    setBoxPersonalization,
    setKitQuantity: updateKitQuantity,
    setIdentity,
    goToStep,
    nextStep,
    prevStep,
    resetKit,
    loadKit,
  } = useKitBuilder();

  const setKitQuantity = useCallback((next: Parameters<typeof updateKitQuantity>[0]) => {
    const quantity = typeof next === 'function' ? next(kitQuantity) : next;
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      toast.error('Informe uma quantidade inteira maior que zero.');
      return;
    }
    updateKitQuantity(quantity);
    setQuantityNeedsConfirmation(false);
  }, [updateKitQuantity, kitQuantity]);

  const pricesKnown = hasKnownKitPrices(kitState);
  const { isSaving, saveKit, savedKits, isLoadingKits } = useCustomKitPersistence();
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
  } = useKitAutoSave(
    kitState, kitQuantity, currentKitId, currentRevision,
    (id, revision) => { setCurrentKitId(id); setCurrentRevision(revision); },
    !isHydrating && !hydrationError && pricesKnown && !quantityNeedsConfirmation && (!kitIdParam || hydratedScope === `${user?.id ?? 'anonymous'}:${kitIdParam}` && currentKitId === kitIdParam && currentRevision !== null),
    { quoteClient, flow: wizardState.flow, aiBriefing },
  );
  const { undo, redo, canUndo, canRedo } = useKitUndoRedo();
  useDuplicateKitDetector();
  const loadedProductKeyRef = useRef<string | null>(null);
  const loadActionsRef = useRef({ addItem, setKitName, loadKit, kitState, kitQuantity, flow: wizardState.flow, step: wizardState.currentStep, goToStep });
  useEffect(() => {
    loadActionsRef.current = { addItem, setKitName, loadKit, kitState, kitQuantity, flow: wizardState.flow, step: wizardState.currentStep, goToStep };
  }, [addItem, setKitName, loadKit, kitState, kitQuantity, wizardState.flow, wizardState.currentStep, goToStep]);

  // Hydrate only the requested account-scoped snapshot before any automatic write.
  useEffect(() => {
    if (!kitIdParam) {
      setIsHydrating(false);
      return;
    }
    const hydrationKey = `${user?.id ?? 'anonymous'}:${kitIdParam}`;
    if (hydratedKitRef.current === hydrationKey) return;
    setIsHydrating(true);
    if (isLoadingKits || !user?.id) return;
    const row = savedKits.find((kit) => kit.id === kitIdParam);
    hydratedKitRef.current = hydrationKey;
    const snapshot = row ? toSavedKitSnapshot(row) : null;
    if (!row || !snapshot) {
      const message = row
        ? 'O rascunho contém campos incompletos ou inválidos. Revise o kit na biblioteca antes de salvar.'
        : 'Não foi possível abrir este kit salvo.';
      setHydrationError(message);
      setIsHydrating(false);
      toast.error(message);
      return;
    }
    loadKit(snapshot);
    setQuoteClient(snapshot.quoteClient);
    setAIBriefing(snapshot.aiBriefing);
    setCurrentKitId(row.id);
    setCurrentRevision(row.revision);
    setQuantityNeedsConfirmation(typeof row.kit_quantity !== 'number' || !Number.isSafeInteger(row.kit_quantity) || row.kit_quantity < 1);
    setHydratedScope(hydrationKey);
    setHydrationError(null);
    setIsHydrating(false);
  }, [kitIdParam, user?.id, isLoadingKits, savedKits, loadKit]);

  // A product link can begin the items-first flow before a box is selected.
  // Abort navigation/account changes, and apply each successful URL only once.
  useEffect(() => {
    if (!productIdParam || kitIdParam) return;
    const key = `${user?.id ?? 'anonymous'}:${productIdParam}`;
    if (loadedProductKeyRef.current === key) return;
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), 30_000);
    (async () => {
      try {
        const result = await dbInvoke<ExternalProductForKit>({
          table: 'products', operation: 'select', filters: { id: productIdParam }, limit: 1,
          signal: controller.signal,
        });
        if (controller.signal.aborted || !result.records.length) return;
        const product = result.records[0];
        const item = transformToKitItem(product);
        const current = loadActionsRef.current;
        if (current.kitState.box) {
          const compatibility = current.addItem(item);
          if (!compatibility.fits) {
            toast.warning(compatibility.reason ?? 'Este produto não cabe na caixa selecionada.');
            return;
          }
          if (!current.kitState.name) current.setKitName(product.name || '');
        } else {
          const exists = current.kitState.items.some((entry) => entry.id === item.id);
          current.loadKit({
            name: current.kitState.name || product.name || '',
            kitType: current.kitState.kitType, box: null,
            items: exists ? current.kitState.items : [...current.kitState.items, item],
            personalization: current.kitState.personalization,
            identity: current.kitState.identity,
            kitQuantity: current.kitQuantity, flow: 'items-first',
          });
        }
        loadedProductKeyRef.current = key;
      } catch (error) {
        if (!controller.signal.aborted) logger.warn('[kit-builder] Failed to load product:', error);
      } finally {
        clearTimeout(deadline);
      }
    })();
    return () => { clearTimeout(deadline); controller.abort(); };
  }, [productIdParam, kitIdParam, user?.id]);

  // Effects (Confetti, Title, etc.)
  const showCompletionConfetti = kitState.isValid && kitState.items.length > 0;
  useEffect(() => {
    if (showCompletionConfetti) {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.85, x: 0.5 }, colors: ['#f97316'] });
    }
  }, [showCompletionConfetti]);

  const pricing = calculateTotalKitPrice(
    kitState.box,
    kitState.items,
    kitState.personalization,
    kitQuantity,
  );

  const handleSaveKit = useCallback(async () => {
    if (!pricesKnown) { toast.error(KIT_UNKNOWN_PRICE_MESSAGE); return; }
    if (quantityNeedsConfirmation) {
      toast.error('Defina a quantidade do rascunho antes de salvar ou criar um orçamento.');
      return;
    }
    if (isHydrating || hydrationError || kitIdParam && hydratedScope !== `${user?.id ?? 'anonymous'}:${kitIdParam}`) {
      toast.error(hydrationError ?? 'Aguarde o carregamento do kit salvo.');
      return;
    }
    if (!kitState.box && kitState.items.length === 0) {
      toast.error('Adicione uma caixa ou item antes de salvar o kit.');
      return;
    }
    if (isAutoSaving || isSaving) {
      toast.info('Aguarde a confirmação do salvamento em andamento.');
      return;
    }
    cancelPendingSave();
    try {
      const id = currentKitId || autoSavedKitId || undefined;
      const saved = await saveKit(kitState, kitQuantity, id, id ? currentRevision : null, {
        quoteClient, flow: wizardState.flow, aiBriefing,
      });
      acknowledgeManualSave(saved.id, saved.revision);
      setCurrentKitId(saved.id);
      setCurrentRevision(saved.revision);
    } catch (error) {
      logger.warn('[kit-builder] Manual save failed:', error);
    }
  }, [pricesKnown, quantityNeedsConfirmation, isHydrating, hydrationError, kitIdParam, hydratedScope, user?.id, kitState, kitQuantity, isAutoSaving, isSaving,
    cancelPendingSave, currentKitId, autoSavedKitId, currentRevision, saveKit,
    quoteClient, wizardState.flow, aiBriefing, acknowledgeManualSave]);

  const handleAddToQuote = useCallback(async (...args: Parameters<typeof createQuote>) => {
    if (!pricesKnown || !hasKnownKitPrices(args[0])) { toast.error(KIT_UNKNOWN_PRICE_MESSAGE); return; }
    if (quantityNeedsConfirmation) {
      toast.error('Defina a quantidade do rascunho antes de salvar ou criar um orçamento.');
      return;
    }
    if (isHydrating || hydrationError || kitIdParam && hydratedScope !== `${user?.id ?? 'anonymous'}:${kitIdParam}`) {
      toast.error(hydrationError ?? 'Aguarde o carregamento do kit salvo.');
      return;
    }
    return createQuote(...args);
  }, [pricesKnown, createQuote, quantityNeedsConfirmation, isHydrating, hydrationError, kitIdParam, hydratedScope, user?.id]);

  const applyAISuggestion = useCallback((
    suggestion: KitAISuggestionBrief, composition: KitAIComposition, requestedQuantity?: number,
  ) => {
    const box = completeBoxCatalog.find((candidate) => candidate.id === composition.box.id);
    const items: KitItem[] = [];
    for (const proposed of composition.items) {
      const product = completeItemCatalog.find((candidate) => candidate.id === proposed.id);
      if (!product || !Number.isSafeInteger(proposed.quantity) || proposed.quantity < 1) {
        toast.error('A composição contém um item indisponível. Atualize o catálogo.');
        return;
      }
      if (!hasKnownKitPrice(product)) { toast.error(KIT_UNKNOWN_PRICE_MESSAGE); return; }
      items.push({ ...product, quantity: proposed.quantity });
    }
    if (box && !hasKnownKitPrice(box)) { toast.error(KIT_UNKNOWN_PRICE_MESSAGE); return; }
    if (!box || items.length === 0) {
      toast.error('A composição não está disponível no catálogo atual.');
      return;
    }
    loadKit({
      name: composition.name, kitType: composition.kitType, box, items,
      personalization: { box: { enabled: false }, items: {} },
      kitQuantity: typeof requestedQuantity === 'number' && Number.isSafeInteger(requestedQuantity) && requestedQuantity > 0
        ? requestedQuantity : kitQuantity,
      flow: 'items-first',
    });
    if (typeof requestedQuantity === 'number' && Number.isSafeInteger(requestedQuantity) && requestedQuantity > 0) {
      setQuantityNeedsConfirmation(false);
    }
    setAIBriefing(suggestion);
    goToStep('items');
    toast.success('Composição da IA aplicada', {
      description: 'Confira variantes, estoque, personalização e valores antes de continuar.',
    });
  }, [completeBoxCatalog, completeItemCatalog, loadKit, kitQuantity, goToStep]);

  const refreshCatalogPrices = useCallback(async () => {
    if (isRefreshingPrices) return;
    const request = ++priceRefreshRequestRef.current;
    const scope = financialScopeRef.current;
    setIsRefreshingPrices(true);
    const isCurrent = () => priceRefreshMountedRef.current && request === priceRefreshRequestRef.current && scope === financialScopeRef.current;
    try {
      const [itemResult, boxResult] = await Promise.all([refetchItems(), refetchBoxes()]);
      if (!isCurrent()) return;
      if (itemResult.error || boxResult.error) throw new Error('Não foi possível consultar os preços do catálogo. Tente novamente.');
      const current = loadActionsRef.current;
      let updated = 0;
      const items = current.kitState.items.map((item) => {
        const fact = itemResult.data?.find((candidate) => candidate.id === item.id);
        if (item.priceKnown !== false || !fact || !hasKnownKitPrice(fact)) return item;
        updated += 1;
        return { ...item, price: fact.price, priceKnown: true };
      });
      let box = current.kitState.box;
      const boxFact = boxResult.data?.find((candidate) => candidate.id === box?.id);
      if (box?.priceKnown === false && boxFact && hasKnownKitPrice(boxFact)) {
        box = { ...box, price: boxFact.price, priceKnown: true };
        updated += 1;
      }
      if (!updated) { toast.info('O catálogo ainda não informa um preço válido para os produtos pendentes.'); return; }
      current.loadKit({ ...current.kitState, box, items, kitQuantity: current.kitQuantity, flow: current.flow });
      current.goToStep(current.step);
      toast.success('Preços atualizados com os valores confirmados no catálogo.');
    } catch (error) {
      if (isCurrent()) toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar os preços.');
    } finally {
      if (isCurrent()) setIsRefreshingPrices(false);
    }
  }, [isRefreshingPrices, refetchItems, refetchBoxes]);

  return {
    state: {
      kitState,
      wizardState,
      kitQuantity,
      currentKitId,
      currentRevision,
      autoSavedKitId,
      isHydrating,
      quantityNeedsConfirmation,
      hydrationError,
      quoteClient,
      setQuoteClient,
      aiBriefing,
      availableBoxes,
      availableItems,
      completeBoxCatalog,
      completeItemCatalog,
      boxQueryError,
      itemQueryError,
      isLoadingBoxes,
      isLoadingItems,
      boxFilters,
      itemFilters,
      setBoxFilters,
      setItemFilters,
      occasion,
      setOccasion,
    },
    actions: {
      setBoxFilters,
      setItemFilters,
      setKitName,
      selectBox,
      clearBox,
      addItem,
      removeItem,
      updateItemQuantity,
      updateItemVariant,
      reorderItems,
      setItemPersonalization,
      setBoxPersonalization,
      setKitQuantity,
      setIdentity,
      goToStep,
      nextStep,
      prevStep,
      resetKit,
      loadKit,
      undo,
      redo,
      canUndo,
      canRedo,
      handleSaveKit,
      applyAISuggestion,
      refetchBoxes,
      refetchItems,
      retryLastSave,
      refreshCatalogPrices,
      handleAddToQuote,
    },
    meta: {
      isSaving,
      isAutoSaving,
      isCreatingQuote,
      lastSavedAt,
      autoSaveError,
      isConflictError,
      pricing,
      pricesKnown,
      isRefreshingPrices,
    },
  };
}
