import { dbInvoke } from '@/lib/db/postgrest';
import { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  transformToKitItem,
  useCustomKitPersistence,
  useDuplicateKitDetector,
  useKitAutoSave,
  useKitBuilder,
  useKitUndoRedo,
  useTemplateSnapshot,
} from '@/hooks/kit-builder';
import { useKitBuilderQuote, type KitQuoteClient } from '@/pages/kit-builder/useKitBuilderQuote';
import {
  calculateTotalKitPrice,
  type ExternalProductForKit,
  type KitBox,
  type KitItem,
  type KitIdentity,
  type KitPersonalization,
  type KitType,
} from '@/lib/kit-builder';
import { logger } from '@/lib/logger';

interface KitBuilderAISuggestion {
  kit_type: KitType;
  box_keywords: string[];
  item_keywords: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toSavedKitSnapshot(row: {
  name: string;
  kit_type?: string | null;
  box_data: Record<string, unknown> | null;
  items_data: Record<string, unknown>[];
  personalization_data: Record<string, unknown>;
  kit_quantity: number;
  color: string;
  icon: string;
  tag: string | null;
  description: string | null;
  is_favorite: boolean;
}) {
  if (!Array.isArray(row.items_data)) return null;
  const kitType: KitType =
    row.kit_type === 'original' || row.kit_type === 'simples' ? row.kit_type : 'montado';
  return {
    name: row.name || '',
    kitType,
    box: isRecord(row.box_data) ? (row.box_data as unknown as KitBox) : null,
    items: row.items_data as unknown as KitItem[],
    personalization: isRecord(row.personalization_data)
      ? (row.personalization_data as unknown as KitPersonalization)
      : { box: { enabled: false }, items: {} },
    kitQuantity: Number.isFinite(row.kit_quantity) && row.kit_quantity > 0 ? row.kit_quantity : 1,
    identity: {
      color: row.color || '#3B82F6',
      icon: row.icon || 'Package',
      tag: row.tag || '',
      description: row.description || '',
      isFavorite: row.is_favorite ?? false,
    } satisfies KitIdentity,
  };
}

export function useKitBuilderPageState() {
  const [searchParams] = useSearchParams();
  const kitIdParam = searchParams.get('kit');
  const productIdParam = searchParams.get('product');
  // A direct product entry has already made the first semantic choice, so it
  // must land in the items-first journey instead of showing an empty box step.
  const initialFlow =
    searchParams.get('flow') === 'items' || productIdParam ? 'items-first' : 'box-first';

  const [currentKitId, setCurrentKitId] = useState<string | undefined>(kitIdParam || undefined);
  const [occasion, setOccasion] = useState<string | null>(null);
  const [quoteClient, setQuoteClient] = useState<KitQuoteClient>({});
  const [isLanding, setIsLanding] = useState(!kitIdParam && !productIdParam);
  const [isHydrating, setIsHydrating] = useState(Boolean(kitIdParam));
  const hydratedKitIdRef = useRef<string | null>(null);

  const {
    kitState,
    wizardState,
    kitQuantity,
    availableBoxes,
    availableItems,
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
    restoreKitSnapshot,
    setKitType,
    loadKit,
    startNewFlow,
  } = useKitBuilder({ initialFlow });

  const { isSaving, saveKit, savedKits, isLoadingKits } = useCustomKitPersistence();
  useTemplateSnapshot();
  const { handleAddToQuote, isCreatingQuote } = useKitBuilderQuote();
  const {
    lastSavedAt,
    isSaving: isAutoSaving,
    autoSavedKitId,
  } = useKitAutoSave(
    kitState,
    kitQuantity,
    currentKitId,
    (id) => setCurrentKitId(id),
    !isHydrating,
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

  // Captura snapshot a cada mudança significativa do kit. O pushSnapshot
  // deduplica snapshots idênticos e respeita isRestoring (o próprio undo/redo
  // não gera novo snapshot). Isto liga o undo/redo, que antes era inerte
  // (pushSnapshot nunca era chamado → canUndo sempre false).
  useEffect(() => {
    if (isRestoring.current) return;
    pushSnapshot({
      name: kitState.name,
      kitType: kitState.kitType,
      box: kitState.box,
      items: kitState.items,
      personalization: kitState.personalization,
      kitQuantity,
      identity: kitState.identity,
    });
  }, [
    kitState.name,
    kitState.kitType,
    kitState.box,
    kitState.items,
    kitState.personalization,
    kitState.identity,
    kitQuantity,
    pushSnapshot,
    isRestoring,
  ]);

  // undo/redo aplicam o snapshot retornado de volta no estado do kit.
  const undo = useCallback(() => {
    const snap = undoSnapshot();
    if (snap) restoreKitSnapshot(snap);
  }, [undoSnapshot, restoreKitSnapshot]);

  const redo = useCallback(() => {
    const snap = redoSnapshot();
    if (snap) restoreKitSnapshot(snap);
  }, [redoSnapshot, restoreKitSnapshot]);

  // A saved snapshot must be restored before autosave is allowed to run. This
  // prevents a blank first render from replacing an existing kit after opening
  // /montar-kit?kit=<id>.
  useEffect(() => {
    if (!kitIdParam) {
      setIsHydrating(false);
      return;
    }
    if (isLoadingKits || hydratedKitIdRef.current === kitIdParam) return;

    const row = savedKits.find((kit) => kit.id === kitIdParam);
    hydratedKitIdRef.current = kitIdParam;
    if (!row) {
      logger.warn('[kit-builder] Saved kit was not found or is no longer accessible:', kitIdParam);
      toast.error('Não foi possível abrir este kit salvo.');
      setIsHydrating(false);
      return;
    }

    const snapshot = toSavedKitSnapshot(row);
    if (!snapshot) {
      logger.warn('[kit-builder] Invalid saved kit snapshot:', kitIdParam);
      toast.error('O rascunho do kit está em um formato inválido.');
      setIsHydrating(false);
      return;
    }

    loadKit(snapshot);
    setCurrentKitId(row.id);
    setIsHydrating(false);
  }, [isLoadingKits, kitIdParam, loadKit, savedKits]);

  // Load Logic (Simplified for the pattern example)
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
            addItem(transformToKitItem(result.records[0]));
            setKitName(result.records[0].name || '');
          }
        } catch (err) {
          logger.warn('[kit-builder] Failed to load product:', err);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productIdParam, kitIdParam]);

  // Effects (Confetti, Title, etc.)
  useEffect(() => {
    if (kitState.isValid && kitState.items.length > 0) {
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
    if (!kitState.box && kitState.items.length === 0) {
      toast.error('Adicione uma caixa ou item antes de salvar o kit.');
      return;
    }
    try {
      const saved = await saveKit(
        kitState,
        kitQuantity,
        currentKitId || autoSavedKitId || undefined,
      );
      setCurrentKitId(saved.id);
    } catch (error) {
      // useCustomKitPersistence already displays a sanitized message. Keep the
      // error observable without producing a second, potentially unsafe toast.
      logger.warn('[kit-builder] Manual save failed:', error);
    }
  }, [autoSavedKitId, currentKitId, kitQuantity, kitState, saveKit]);

  const applyAISuggestion = useCallback(
    (suggestion: KitBuilderAISuggestion) => {
      setKitType(suggestion.kit_type);
      const boxSearch = suggestion.box_keywords.find(Boolean);
      const itemSearch = suggestion.item_keywords.find(Boolean);
      if (boxSearch) setBoxFilters({ ...boxFilters, search: boxSearch });
      if (itemSearch) setItemFilters({ ...itemFilters, search: itemSearch });
      goToStep('items');
      toast.info('Sugestão aplicada como filtros de catálogo', {
        description: 'Confira preço, estoque e compatibilidade antes de adicionar os itens.',
      });
    },
    [boxFilters, goToStep, itemFilters, setBoxFilters, setItemFilters, setKitType],
  );

  const startFlow = useCallback(
    (flow: 'box-first' | 'items-first') => {
      startNewFlow(flow);
      setQuoteClient({});
      setIsLanding(false);
    },
    [startNewFlow],
  );

  const resetKitAndQuoteClient = useCallback(() => {
    resetKit();
    setQuoteClient({});
  }, [resetKit]);

  return {
    state: {
      kitState,
      wizardState,
      kitQuantity,
      currentKitId,
      autoSavedKitId,
      availableBoxes,
      availableItems,
      isLoadingBoxes,
      isLoadingItems,
      boxError,
      itemError,
      refetchBoxes,
      refetchItems,
      isHydrating,
      isLanding,
      boxFilters,
      itemFilters,
      setBoxFilters,
      setItemFilters,
      occasion,
      setOccasion,
      quoteClient,
      setQuoteClient,
    },
    actions: {
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
      resetKit: resetKitAndQuoteClient,
      undo,
      redo,
      canUndo,
      canRedo,
      handleSaveKit,
      handleAddToQuote,
      applyAISuggestion,
      startFlow,
    },
    meta: {
      isSaving,
      isAutoSaving,
      isCreatingQuote,
      lastSavedAt,
      pricing,
    },
  };
}
