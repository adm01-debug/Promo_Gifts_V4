import { beforeEach, describe, expect, it } from 'vitest';
import { useProductSelectionStore } from './useProductSelectionStore';

describe('useProductSelectionStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useProductSelectionStore.getState().clearSelections();
  });

  it('persiste nome e identidade exata da variante atomicamente', () => {
    useProductSelectionStore.getState().setSelectedVariant('product-1', 'variant-2', 'Vermelho');

    expect(useProductSelectionStore.getState().selectedColors['product-1']).toBe('Vermelho');
    expect(useProductSelectionStore.getState().selectedVariantIds['product-1']).toBe('variant-2');
  });

  it('remove variant_id obsoleto ao gravar uma seleção legada', () => {
    const store = useProductSelectionStore.getState();
    store.setSelectedVariant('product-1', 'variant-2', 'Vermelho');
    useProductSelectionStore.getState().setSelectedColor('product-1', 'Azul');

    expect(useProductSelectionStore.getState().selectedColors['product-1']).toBe('Azul');
    expect(useProductSelectionStore.getState().selectedVariantIds['product-1']).toBeUndefined();
  });

  it('limpa nome e variant_id juntos', () => {
    useProductSelectionStore.getState().setSelectedVariant('product-1', 'variant-2', 'Vermelho');
    useProductSelectionStore.getState().clearSelectedColor('product-1');

    expect(useProductSelectionStore.getState().selectedColors['product-1']).toBeUndefined();
    expect(useProductSelectionStore.getState().selectedVariantIds['product-1']).toBeUndefined();
  });
});
