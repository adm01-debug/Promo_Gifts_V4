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
  const [kitQuantity, setKitQuantity] = useState(1);
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

  const addItem = useCallback(
    (item: KitItem): CompatibilityResult => {
      if (!selectedBox) {
        setSelectedItems((previous) => {
          const existingIndex = previous.findIndex((candidate) => candidate.id === item.id);
          if (existingIndex < 0) return [...previous, { ...item, quantity: 1 }];
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

      const existingIndex = selectedItems.findIndex((i) => i.id === item.id);
      if (existingIndex >= 0) {
        const updatedItems = [...selectedItems];
        const newQuantity = updatedItems[existingIndex].quantity + 1;

        const result = checkItemFits(
          { ...item, quantity: 1 },
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

      const result = checkItemFits(item, selectedBox, selectedItems, 1);

      if (result.fits) {
        setSelectedItems((prev) => [...prev, { ...item, quantity: 1 }]);
      }

      return result;
    },
    [selectedBox, selectedItems],
  );

  const removeItem = useCallback((itemId: string) => {
    setSelectedItems((prev) => prev.filter((i) => i.id !== itemId));
    setPersonalization((prev) => {
      const { [itemId]: _, ...rest } = prev.items;
      return { ...prev, items: rest };
    });
  }, []);

  const updateItemQuantity = useCallback(
    (itemId: string, quantity: number) => {
      if (quantity <= 0) {
        removeItem(itemId);
        return;
      }

      if (selectedBox) {
        const item = selectedItems.find((i) => i.id === itemId);
        if (item && quantity > item.quantity) {
          const otherItems = selectedItems.filter((i) => i.id !== itemId);
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
        prev.map((item) => (item.id === itemId ? { ...item, quantity } : item)),
      );
    },
    [removeItem, selectedBox, selectedItems],
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
      setSelectedItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;
          return {
            ...item,
            selectedVariantId: variantData.id,
            selectedColor: variantData.color,
            selectedSize: variantData.size || undefined,
            ...(variantData.sku && { sku: variantData.sku }),
            ...(variantData.imageUrl !== undefined && { imageUrl: variantData.imageUrl }),
            ...(variantData.price !== undefined && { price: variantData.price }),
          };
        }),
      );
    },
    [],
  );

  const updateItemColor = useCallback((itemId: string, color: { name: string; hex?: string }) => {
    setSelectedItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, selectedColor: color } : item)),
    );
  }, []);

  const toggleOptionalItem = useCallback((itemId: string, item?: KitItem) => {
    setSelectedItems((prev) => {
      const exists = prev.find((i) => i.id === itemId);
      if (exists) {
        return prev.filter((i) => i.id !== itemId);
      }
      if (item) {
        return [...prev, { ...item, quantity: 1 }];
      }
      return prev;
    });
  }, []);

  const setItemPersonalization = useCallback((itemId: string, config: KitItemPersonalization) => {
    setPersonalization((prev) => ({
      ...prev,
      items: {
        ...prev.items,
        [itemId]: config,
      },
    }));
  }, []);

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
    setKitQuantity(1);
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
    setKitQuantity(1);
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
      setSelectedItems(data.items);
      setPersonalization(data.personalization || { box: { enabled: false }, items: {} });
      setKitQuantity(data.kitQuantity || 1);
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
    setSelectedItems(snap.items);
    setPersonalization(snap.personalization ?? { box: { enabled: false }, items: {} });
    setKitQuantity(snap.kitQuantity || 1);
    if (snap.identity) setIdentity(snap.identity);
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
    flow,
  };
}
