import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ProductSelectionState {
  // Map of productId -> colorName
  selectedColors: Record<string, string>;
  // Map de productId -> variantId. Mantido separado para preservar compatibilidade
  // com o estado persistido legado, que armazena apenas o nome da cor.
  selectedVariantIds: Record<string, string>;
}

interface ProductSelectionActions {
  setSelectedColor: (productId: string, colorName: string) => void;
  setSelectedVariant: (productId: string, variantId: string, colorName: string) => void;
  clearSelectedColor: (productId: string) => void;
  getSelectedColor: (productId: string) => string | undefined;
  clearSelections: () => void;
}

export const useProductSelectionStore = create<ProductSelectionActions & ProductSelectionState>()(
  persist(
    (set, get) => ({
      selectedColors: {},
      selectedVariantIds: {},

      setSelectedColor: (productId, colorName) => {
        set((state) => {
          const next = { ...state.selectedColors, [productId]: colorName };
          const nextVariantIds = { ...state.selectedVariantIds };
          delete nextVariantIds[productId];
          // FIX: cap a 200 entradas para não crescer indefinidamente no localStorage.
          // Remove as entradas mais antigas (primeiras inseridas) quando o limite é atingido.
          const keys = Object.keys(next);
          if (keys.length > 200) {
            const excess = keys.slice(0, keys.length - 200);
            for (const k of excess) {
              delete next[k];
              delete nextVariantIds[k];
            }
          }
          return { selectedColors: next, selectedVariantIds: nextVariantIds };
        });
      },

      setSelectedVariant: (productId, variantId, colorName) => {
        set((state) => {
          const selectedColors = { ...state.selectedColors, [productId]: colorName };
          const selectedVariantIds = { ...state.selectedVariantIds, [productId]: variantId };
          const keys = Object.keys(selectedColors);
          if (keys.length > 200) {
            const excess = keys.slice(0, keys.length - 200);
            for (const key of excess) {
              delete selectedColors[key];
              delete selectedVariantIds[key];
            }
          }
          return { selectedColors, selectedVariantIds };
        });
      },

      clearSelectedColor: (productId) => {
        set((state) => {
          const selectedColors = { ...state.selectedColors };
          const selectedVariantIds = { ...state.selectedVariantIds };
          delete selectedColors[productId];
          delete selectedVariantIds[productId];
          return { selectedColors, selectedVariantIds };
        });
      },

      getSelectedColor: (productId) => {
        return get().selectedColors[productId];
      },

      clearSelections: () => {
        set({ selectedColors: {}, selectedVariantIds: {} });
      },
    }),
    {
      name: 'product-selection-storage',
    },
  ),
);
