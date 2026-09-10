import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { KitBox, KitItem } from '@/lib/kit-builder';

vi.mock('@/hooks/kit-builder/useKitBuilderQueries', () => ({
  useKitBuilderQueries: () => ({
    availableBoxes: [],
    availableItems: [],
    isLoadingBoxes: false,
    isLoadingItems: false,
    boxError: null,
    itemError: null,
    refetchBoxes: vi.fn(),
    refetchItems: vi.fn(),
    boxFilters: {},
    itemFilters: {},
    setBoxFilters: vi.fn(),
    setItemFilters: vi.fn(),
  }),
}));

vi.mock('sonner', () => ({ toast: { warning: vi.fn() } }));

const box: KitBox = {
  id: 'box-1',
  name: 'Caixa interna conhecida',
  sku: 'CX-1',
  imageUrl: null,
  price: 10,
  internalWidth: 30,
  internalHeight: 20,
  internalDepth: 15,
  internalVolume: 9000,
  dimensionsKnown: true,
};

const item: KitItem = {
  id: 'item-1',
  name: 'Caneta',
  sku: 'CAN-1',
  imageUrl: null,
  price: 5,
  width: 1,
  height: 1,
  depth: 15,
  volume: 15,
  quantity: 1,
  dimensionsKnown: true,
};

describe('useKitBuilder — fluxos de montagem', () => {
  it('permite compor itens antes da caixa e preserva a composição ao trocar embalagem', async () => {
    const { useKitBuilder } = await import('@/hooks/kit-builder/useKitBuilder');
    const { result } = renderHook(() => useKitBuilder({ initialFlow: 'items-first' }));

    expect(result.current.wizardState.flow).toBe('items-first');
    expect(result.current.wizardState.currentStep).toBe('items');

    act(() => {
      expect(result.current.addItem(item).fits).toBe(true);
    });
    expect(result.current.kitState.items).toHaveLength(1);

    act(() => result.current.nextStep());
    expect(result.current.wizardState.currentStep).toBe('box');

    act(() => result.current.selectBox(box));
    act(() => result.current.nextStep());
    expect(result.current.wizardState.currentStep).toBe('personalization');

    act(() => result.current.clearBox());
    expect(result.current.kitState.box).toBeNull();
    expect(result.current.kitState.items).toEqual([expect.objectContaining({ id: item.id })]);
  });

  it('não marca personalização como concluída só porque o resumo foi aberto', async () => {
    const { useKitBuilder } = await import('@/hooks/kit-builder/useKitBuilder');
    const { result } = renderHook(() => useKitBuilder());

    act(() => result.current.goToStep('summary'));
    expect(result.current.wizardState.completedSteps).not.toContain('personalization');
  });
});
