/**
 * Kit Builder Hook
 * Gerencia o estado completo do montador de kits
 * Queries are isolated in useKitBuilderQueries to prevent React fiber corruption.
 */

import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import {
  type KitBox,
  type KitItem,
  type KitState,
  type KitType,
  type KitIdentity,
  type KitPersonalization,
  type KitItemPersonalization,
  type KitBuilderStep,
  type KitBuilderFlow,
  type KitBuilderWizardState,
  type CompatibilityResult,
  type KitAIComposition,
  getKitItemLineId,
  normalizeKitItemLine,
  calculateTotalItemsVolume,
  calculateVolumeUsagePercent,
  calculateUsableVolume,
  checkItemFits,
  calculateTotalKitPrice,
} from '@/lib/kit-builder';
import { useKitBuilderQueries } from '@/hooks/kit-builder/useKitBuilderQueries';
import type { KitSnapshot } from '@/hooks/kit-builder/useKitUndoRedo';

// ============================================
// HOOK PRINCIPAL
// ============================================

interface UseKitBuilderOptions {
  initialFlow?: KitBuilderFlow;
}

export function useKitBuilder({ initialFlow = 'box-first' }: UseKitBuilderOptions = {}) {
  // Estado do kit
  const [kitName, setKitName] = useState('');
  const [kitType, setKitType] = useState<KitType>('montado');
  const [selectedBox, setSelectedBox] = useState<KitBox | null>(null);
  const [selectedItems, setSelectedItems] = useState<KitItem[]>([]);
  const [personalization, setPersonalization] = useState<KitPersonalization>({
    box: { enabled: false },
    items: {},
  });
  const [kitQuantity, setKitQuantityState] = useState(1);
  const [identity, setIdentity] = useState<KitIdentity>({
    color: '#3B82F6',
    icon: 'Package',
    tag: '',
    description: '',
    isFavorite: false,
  });

  // Estado do wizard. The journey must be explicit: inferring it from the
  // current step makes a saved draft ambiguous and broke the items-first UI.
  const [flow, setFlow] = useState<KitBuilderFlow>(initialFlow);
  const [currentStep, setCurrentStep] = useState<KitBuilderStep>(
    initialFlow === 'items-first' ? 'items' : 'box',
  );
  const [personalizationReviewed, setPersonalizationReviewed] = useState(false);

  // Queries isoladas em hook separado
  const {
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
  } = useKitBuilderQueries();

  // ============================================
  // CÁLCULOS DERIVADOS
  // ============================================

  const kitState = useMemo((): KitState => {
    const totalItemsVolume = calculateTotalItemsVolume(selectedItems);
    const boxVolume = selectedBox?.internalVolume || 0;
    const usableVolume = selectedBox ? calculateUsableVolume(selectedBox) : 0;
    const availableVolume = Math.max(0, usableVolume - totalItemsVolume);
    const volumeUsagePercent = calculateVolumeUsagePercent(totalItemsVolume, boxVolume);

    const boxWeight = selectedBox?.weight || 0;
    const itemsWeight = selectedItems.reduce(
      (sum, item) => sum + (item.weight || 0) * item.quantity,
      0,
    );
    const totalWeight = boxWeight + itemsWeight;

    const pricing = calculateTotalKitPrice(
      selectedBox,
      selectedItems,
      personalization,
      kitQuantity,
    );

    const validationErrors: string[] = [];
    if (!selectedBox) validationErrors.push('Selecione uma caixa');
    if (selectedItems.length === 0) validationErrors.push('Adicione pelo menos um item ao kit');
    if (volumeUsagePercent > 100)
      validationErrors.push('Volume dos itens excede a capacidade da caixa');

    if (selectedBox) {
      if (selectedBox.dimensionsKnown === false) {
        validationErrors.push('A caixa selecionada não possui dimensões internas confirmadas');
      }
      const itemWithUnknownDimensions = selectedItems.find(
        (item) => item.dimensionsKnown === false,
      );
      if (itemWithUnknownDimensions) {
        validationErrors.push(
          `${itemWithUnknownDimensions.name} não possui dimensões confirmadas para validação`,
        );
      }
      const incompatibleItem = selectedItems.find((item) => {
        const otherItems = selectedItems.filter((candidate) => candidate !== item);
        return !checkItemFits(item, selectedBox, otherItems, item.quantity).fits;
      });
      if (incompatibleItem) {
        validationErrors.push(`${incompatibleItem.name} não é compatível com a caixa selecionada`);
      }
    }

    // Weight validation
    if (selectedBox?.maxWeight && itemsWeight > selectedBox.maxWeight) {
      validationErrors.push(
        `Peso dos itens (${(itemsWeight / 1000).toFixed(1)}kg) excede o limite da caixa (${(selectedBox.maxWeight / 1000).toFixed(1)}kg)`,
      );
    }

    const incompletePersonalization = [
      personalization.box,
      ...Object.values(personalization.items),
    ].find(
      (config) =>
        config.enabled &&
        (!config.techniqueId || !(config.positionCode || config.position || config.positionName)),
    );
    if (incompletePersonalization) {
      validationErrors.push(
        'Conclua técnica e área de aplicação da personalização antes de revisar',
      );
    }

    const personalizationPricingTargets = [
      { config: personalization.box, quantity: kitQuantity },
      ...selectedItems.map((item) => ({
        config: personalization.items[getKitItemLineId(item)] ?? personalization.items[item.id],
        quantity: item.quantity * kitQuantity,
      })),
    ];
    const personalizationWithoutPrice = personalizationPricingTargets.find(
      ({ config, quantity }) =>
        config?.enabled &&
        (!Number.isFinite(config.estimatedPrice) ||
          (config.estimatedPrice ?? -1) < 0 ||
          config.pricedQuantity !== quantity ||
          !Number.isFinite(config.totalPrice) ||
          (config.totalPrice ?? -1) < 0),
    );
    if (personalizationWithoutPrice) {
      validationErrors.push(
        'Aguarde o preço da personalização antes de revisar ou criar o orçamento',
      );
    }

    return {
      name: kitName,
      kitType,
      box: selectedBox,
      items: selectedItems,
      personalization,
      identity,
      totalItemsVolume,
      availableVolume,
      volumeUsagePercent,
      totalWeight,
      boxPrice: pricing.boxPrice,
      itemsPrice: pricing.itemsPrice,
      personalizationPrice: pricing.personalizationPrice,
      totalPrice: pricing.total,
      isValid: validationErrors.length === 0,
      validationErrors,
    };
  }, [kitName, kitType, selectedBox, selectedItems, personalization, kitQuantity, identity]);

  const wizardState = useMemo((): KitBuilderWizardState => {
    const completedSteps: KitBuilderStep[] = [];

    if (selectedBox) completedSteps.push('box');
    if (selectedItems.length > 0) completedSteps.push('items');

    if (personalizationReviewed) {
      completedSteps.push('personalization');
    }

    let canProceed = false;
    switch (currentStep) {
      case 'box':
        canProceed = selectedBox !== null;
        break;
      case 'items':
        canProceed =
          selectedItems.length > 0 &&
          (!selectedBox ||
            (kitState.volumeUsagePercent <= 100 &&
              !kitState.validationErrors.some((error) => error.includes('não é compatível'))));
        break;
      case 'personalization':
        canProceed = kitState.isValid;
        break;
      case 'summary':
        canProceed = kitState.isValid;
        break;
    }

    return {
      currentStep,
      completedSteps,
      canProceed,
      flow,
    };
  }, [currentStep, selectedBox, selectedItems, personalizationReviewed, kitState, flow]);

  // ============================================
  // AÇÕES
  // ============================================

  const selectBox = useCallback((box: KitBox) => {
    setSelectedBox(box);
  }, []);

  const clearBox = useCallback(() => {
    setSelectedBox(null);
    // Items-first is a supported journey. Changing the packaging must not
    // silently discard the composition or item-level personalization.
    setPersonalization((current) => ({ ...current, box: { enabled: false } }));
  }, []);

  const setKitQuantity = useCallback((quantity: number) => {
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      toast.warning('Quantidade inválida', {
        description: 'A quantidade de kits deve ser um número inteiro maior que zero.',
      });
      return;
    }
    setKitQuantityState(quantity);
  }, []);

  const addItem = useCallback(
    (item: KitItem): CompatibilityResult => {
      if (!selectedBox) {
        setSelectedItems((previous) => {
          const nextItem = normalizeKitItemLine({ ...item, quantity: 1 });
          const existingIndex = previous.findIndex(
            (candidate) => getKitItemLineId(candidate) === getKitItemLineId(nextItem),
          );
          if (existingIndex < 0) return [...previous, nextItem];
          return previous.map((candidate, index) =>
            index === existingIndex
              ? { ...candidate, quantity: candidate.quantity + 1 }
              : candidate,
          );
        });
        return {
          fits: true,
          reason: 'Item adicionado. A compatibilidade será validada após a escolha da caixa.',
        };
      }

      const normalizedItem = normalizeKitItemLine({ ...item, quantity: 1 });
      const existingIndex = selectedItems.findIndex(
        (candidate) => getKitItemLineId(candidate) === getKitItemLineId(normalizedItem),
      );
      if (existingIndex >= 0) {
        const updatedItems = [...selectedItems];
        const newQuantity = updatedItems[existingIndex].quantity + 1;

        const result = checkItemFits(
          normalizedItem,
          selectedBox,
          selectedItems.filter((_, i) => i !== existingIndex),
          newQuantity,
        );

        if (result.fits) {
          updatedItems[existingIndex] = {
            ...updatedItems[existingIndex],
            quantity: newQuantity,
          };
          setSelectedItems(updatedItems);
        }

        return result;
      }

      const result = checkItemFits(normalizedItem, selectedBox, selectedItems, 1);

      if (result.fits) {
        setSelectedItems((prev) => [...prev, normalizedItem]);
      }

      return result;
    },
    [selectedBox, selectedItems],
  );

  const removeItem = useCallback((itemId: string) => {
    const matchesLine = (item: KitItem) => getKitItemLineId(item) === itemId;
    setSelectedItems((prev) => prev.filter((item) => !matchesLine(item)));
    setPersonalization((prev) => {
      const { [itemId]: _removedLine, ...rest } = prev.items;
      return { ...prev, items: rest };
    });
  }, []);

  const updateItemQuantity = useCallback(
    (itemId: string, quantity: number) => {
      if (!Number.isSafeInteger(quantity) || quantity < 1) {
        toast.warning('Quantidade inválida', {
          description: 'Use um número inteiro maior que zero ou remova o item.',
        });
        return;
      }

      if (selectedBox) {
        const item = selectedItems.find((candidate) => getKitItemLineId(candidate) === itemId);
        if (item && quantity > item.quantity) {
          const otherItems = selectedItems.filter(
            (candidate) => getKitItemLineId(candidate) !== itemId,
          );
          const result = checkItemFits(item, selectedBox, otherItems, quantity);
          if (!result.fits) {
            toast.warning('Volume excedido', {
              description: result.reason || 'Essa quantidade não cabe na caixa selecionada.',
            });
            return;
          }
        }
      }

      setSelectedItems((prev) =>
        prev.map((item) => (getKitItemLineId(item) === itemId ? { ...item, quantity } : item)),
      );
    },
    [selectedBox, selectedItems],
  );

  const updateItemVariant = useCallback(
    (
      itemId: string,
      variantData: {
        id: string;
        color: { name: string; hex?: string };
        size?: string;
        sku?: string;
        imageUrl?: string | null;
        price?: number;
      },
    ) => {
      const currentItem = selectedItems.find((candidate) => getKitItemLineId(candidate) === itemId);
      if (!currentItem) return;
      const previousLineId = getKitItemLineId(currentItem);
      const nextLineId = `${currentItem.id}:${variantData.id}`;
      const hasExistingTarget = selectedItems.some(
        (candidate) =>
          getKitItemLineId(candidate) === nextLineId &&
          getKitItemLineId(candidate) !== previousLineId,
      );

      setSelectedItems((prev) =>
        prev.flatMap((item) => {
          if (getKitItemLineId(item) !== itemId) return [item];
          const updated = {
            ...item,
            lineId: nextLineId,
            selectedVariantId: variantData.id,
            selectedColor: variantData.color,
            selectedSize: variantData.size || undefined,
            ...(variantData.sku && { sku: variantData.sku }),
            ...(variantData.imageUrl !== undefined && { imageUrl: variantData.imageUrl }),
            ...(variantData.price !== undefined && { price: variantData.price }),
          };
          if (!hasExistingTarget) return [updated];

          // Selecting a variant already present in this kit must combine the
          // quantity, never create an ambiguous duplicate composition line.
          return [];
        }),
      );

      setSelectedItems((prev) =>
        prev.map((item) =>
          hasExistingTarget &&
          getKitItemLineId(item) === nextLineId &&
          previousLineId !== nextLineId
            ? { ...item, quantity: item.quantity + currentItem.quantity }
            : item,
        ),
      );
      setPersonalization((prev) => {
        const config = prev.items[previousLineId] ?? prev.items[currentItem.id];
        if (!config || previousLineId === nextLineId || prev.items[nextLineId]) return prev;
        const {
          [previousLineId]: _legacyLine,
          [currentItem.id]: _legacyProduct,
          ...items
        } = prev.items;
        return { ...prev, items: { ...items, [nextLineId]: config } };
      });
    },
    [selectedItems],
  );

  const updateItemColor = useCallback((itemId: string, color: { name: string; hex?: string }) => {
    setSelectedItems((prev) =>
      prev.map((item) =>
        getKitItemLineId(item) === itemId ? { ...item, selectedColor: color } : item,
      ),
    );
  }, []);

  const toggleOptionalItem = useCallback((itemId: string, optionalItem?: KitItem) => {
    setSelectedItems((prev) => {
      const exists = prev.find((item) => getKitItemLineId(item) === itemId);
      if (exists) {
        return prev.filter((candidate) => getKitItemLineId(candidate) !== itemId);
      }
      if (optionalItem) {
        return [...prev, normalizeKitItemLine({ ...optionalItem, quantity: 1 })];
      }
      return prev;
    });
  }, []);

  const setItemPersonalization = useCallback(
    (itemId: string, config: KitItemPersonalization) => {
      const selectedItem =
        selectedItems.find((item) => getKitItemLineId(item) === itemId) ??
        selectedItems.find((item) => item.id === itemId);
      const canonicalLineId = selectedItem ? getKitItemLineId(selectedItem) : itemId;
      setPersonalization((prev) => ({
        ...prev,
        items: {
          ...prev.items,
          [canonicalLineId]: config,
        },
      }));
    },
    [selectedItems],
  );

  const setBoxPersonalization = useCallback((config: KitItemPersonalization) => {
    setPersonalization((prev) => ({
      ...prev,
      box: config,
    }));
  }, []);

  const goToStep = useCallback((step: KitBuilderStep) => {
    setCurrentStep(step);
  }, []);

  const nextStep = useCallback(() => {
    const steps: KitBuilderStep[] =
      flow === 'items-first'
        ? ['items', 'box', 'personalization', 'summary']
        : ['box', 'items', 'personalization', 'summary'];
    const currentIndex = steps.indexOf(currentStep);
    const canAdvance =
      (currentStep === 'box' && selectedBox !== null) ||
      (currentStep === 'items' && selectedItems.length > 0 && (!selectedBox || kitState.isValid)) ||
      currentStep === 'personalization';
    if (canAdvance && currentIndex < steps.length - 1) {
      if (currentStep === 'personalization') setPersonalizationReviewed(true);
      setCurrentStep(steps[currentIndex + 1]);
    }
  }, [currentStep, flow, selectedBox, selectedItems.length, kitState.isValid]);

  const prevStep = useCallback(() => {
    const steps: KitBuilderStep[] =
      flow === 'items-first'
        ? ['items', 'box', 'personalization', 'summary']
        : ['box', 'items', 'personalization', 'summary'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  }, [currentStep, flow]);

  const reorderItems = useCallback((fromIndex: number, toIndex: number) => {
    setSelectedItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const resetKit = useCallback(() => {
    setKitName('');
    setKitType('montado');
    setSelectedBox(null);
    setSelectedItems([]);
    setPersonalization({ box: { enabled: false }, items: {} });
    setKitQuantityState(1);
    setIdentity({ color: '#3B82F6', icon: 'Package', tag: '', description: '', isFavorite: false });
    setPersonalizationReviewed(false);
    setCurrentStep(flow === 'items-first' ? 'items' : 'box');
  }, [flow]);

  const startNewFlow = useCallback((nextFlow: KitBuilderFlow) => {
    setKitName('');
    setKitType('montado');
    setSelectedBox(null);
    setSelectedItems([]);
    setPersonalization({ box: { enabled: false }, items: {} });
    setKitQuantityState(1);
    setIdentity({ color: '#3B82F6', icon: 'Package', tag: '', description: '', isFavorite: false });
    setPersonalizationReviewed(false);
    setFlow(nextFlow);
    setCurrentStep(nextFlow === 'items-first' ? 'items' : 'box');
  }, []);

  /** Load a saved kit (from custom_kits JSONB snapshots) into the wizard */
  const loadKit = useCallback(
    (data: {
      name: string;
      kitType: KitType;
      box: KitBox | null;
      items: KitItem[];
      personalization: KitPersonalization;
      kitQuantity: number;
      identity?: KitIdentity;
    }) => {
      setKitName(data.name);
      setKitType(data.kitType);
      setSelectedBox(data.box);
      const normalizedItems = data.items.map(normalizeKitItemLine);
      const normalizedPersonalizations = {
        ...(data.personalization || { box: { enabled: false }, items: {} }),
      };
      normalizedPersonalizations.items = { ...normalizedPersonalizations.items };
      normalizedItems.forEach((item) => {
        const lineId = getKitItemLineId(item);
        if (
          !normalizedPersonalizations.items[lineId] &&
          normalizedPersonalizations.items[item.id]
        ) {
          normalizedPersonalizations.items[lineId] = normalizedPersonalizations.items[item.id];
        }
      });
      setSelectedItems(normalizedItems);
      setPersonalization(normalizedPersonalizations);
      setKitQuantityState(
        Number.isSafeInteger(data.kitQuantity) && data.kitQuantity > 0 ? data.kitQuantity : 1,
      );
      if (data.identity) {
        setIdentity({
          color: data.identity.color || '#3B82F6',
          icon: data.identity.icon || 'Package',
          tag: data.identity.tag || '',
          description: data.identity.description || '',
          isFavorite: data.identity.isFavorite ?? false,
        });
      }
      setPersonalizationReviewed(true);
      setCurrentStep('summary');
    },
    [],
  );

  /**
   * Restaura um snapshot completo (undo/redo). Diferente de `loadKit`, NÃO
   * força o passo "summary" — undo/redo preserva o passo atual do usuário.
   */
  const restoreKitSnapshot = useCallback((snap: KitSnapshot) => {
    setKitName(snap.name);
    setKitType(snap.kitType);
    setSelectedBox(snap.box);
    setSelectedItems(snap.items.map(normalizeKitItemLine));
    setPersonalization(snap.personalization ?? { box: { enabled: false }, items: {} });
    setKitQuantityState(
      Number.isSafeInteger(snap.kitQuantity) && snap.kitQuantity > 0 ? snap.kitQuantity : 1,
    );
    if (snap.identity) setIdentity(snap.identity);
  }, []);

  const applyAIComposition = useCallback((composition: KitAIComposition) => {
    setKitName(composition.name);
    setKitType(composition.kitType);
    setSelectedBox(composition.box);
    setSelectedItems(composition.items.map(normalizeKitItemLine));
    setPersonalization({ box: { enabled: false }, items: {} });
    setPersonalizationReviewed(false);
    setFlow('items-first');
    setCurrentStep('items');
  }, []);

  // ============================================
  // FILTROS COM COMPATIBILIDADE
  // ============================================

  const itemsWithCompatibility = useMemo(() => {
    if (!selectedBox)
      return availableItems.map((item) => ({
        ...item,
        compatibility: null as CompatibilityResult | null,
      }));

    return availableItems.map((item) => {
      const compatibility = checkItemFits(item, selectedBox, selectedItems, 1);
      return { ...item, compatibility };
    });
  }, [availableItems, selectedBox, selectedItems]);

  const filteredItems = useMemo(() => {
    let items = itemsWithCompatibility;

    if (itemFilters.onlyFitting) {
      items = items.filter((item) => item.compatibility?.fits !== false);
    }

    if (itemFilters.maxVolume) {
      items = items.filter((item) => item.volume <= (itemFilters.maxVolume || Infinity));
    }

    if (itemFilters.category) {
      const categoryFilter = itemFilters.category.toLowerCase();
      items = items.filter((item) => item.category?.toLowerCase().includes(categoryFilter));
    }

    if (itemFilters.material) {
      const materialFilter = itemFilters.material.toLocaleLowerCase('pt-BR');
      items = items.filter((item) =>
        item.material?.toLocaleLowerCase('pt-BR').includes(materialFilter),
      );
    }

    if (Number.isFinite(itemFilters.minPrice)) {
      items = items.filter((item) => item.price >= (itemFilters.minPrice ?? 0));
    }
    if (Number.isFinite(itemFilters.maxPrice)) {
      items = items.filter((item) => item.price <= (itemFilters.maxPrice ?? Infinity));
    }

    if (itemFilters.sort === 'price-asc') items = [...items].sort((a, b) => a.price - b.price);
    if (itemFilters.sort === 'price-desc') items = [...items].sort((a, b) => b.price - a.price);
    if (itemFilters.sort === 'name')
      items = [...items].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    return items;
  }, [itemsWithCompatibility, itemFilters]);

  // ============================================
  // RETURN
  // ============================================

  return {
    kitState,
    wizardState,
    kitQuantity,
    availableBoxes,
    availableItems: filteredItems,
    allAvailableItems: availableItems,
    isLoadingBoxes,
    isLoadingItems,
    boxError,
    itemError,
    refetchBoxes,
    refetchItems,
    boxFilters,
    setBoxFilters,
    itemFilters,
    setItemFilters,
    setKitName,
    setKitType,
    selectBox,
    clearBox,
    addItem,
    removeItem,
    updateItemQuantity,
    updateItemColor,
    updateItemVariant,
    toggleOptionalItem,
    reorderItems,
    setItemPersonalization,
    setBoxPersonalization,
    setKitQuantity,
    setIdentity,
    setFlow,
    goToStep,
    nextStep,
    prevStep,
    resetKit,
    startNewFlow,
    loadKit,
    restoreKitSnapshot,
    applyAIComposition,
    flow,
  };
}
