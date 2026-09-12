import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { KitBox, KitItem } from '@/lib/kit-builder';

vi.mock('@/hooks/kit-builder/useKitBuilderQueries', () => ({
  useKitBuilderQueries: () => ({
    availableBoxes: [],
    availableItems: [],
    completeBoxCatalog: [],
    completeItemCatalog: [],
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

  it('não permite revisar uma personalização habilitada sem técnica e área', async () => {
    const { useKitBuilder } = await import('@/hooks/kit-builder/useKitBuilder');
    const { result } = renderHook(() => useKitBuilder());

    act(() => {
      result.current.selectBox(box);
      result.current.addItem(item);
      result.current.goToStep('personalization');
      result.current.setItemPersonalization(item.id, { enabled: true });
    });

    expect(result.current.kitState.isValid).toBe(false);
    expect(result.current.wizardState.canProceed).toBe(false);
    expect(result.current.kitState.validationErrors).toContain(
      'Conclua técnica e área de aplicação da personalização antes de revisar',
    );
  });

  it('exige preço confirmado para uma personalização habilitada', async () => {
    const { useKitBuilder } = await import('@/hooks/kit-builder/useKitBuilder');
    const { result } = renderHook(() => useKitBuilder());

    act(() => {
      result.current.selectBox(box);
      result.current.addItem(item);
      result.current.setItemPersonalization('item-1:base', {
        enabled: true,
        techniqueId: 'laser',
        positionCode: 'front',
        estimatedPrice: undefined,
      });
    });

    expect(result.current.kitState.isValid).toBe(false);
    expect(result.current.kitState.validationErrors).toContain(
      'Aguarde o preço da personalização antes de revisar ou criar o orçamento',
    );
  });

  it('mantém linhas independentes para variantes diferentes do mesmo produto', async () => {
    const { useKitBuilder } = await import('@/hooks/kit-builder/useKitBuilder');
    const { result } = renderHook(() => useKitBuilder({ initialFlow: 'items-first' }));

    act(() => result.current.addItem(item));
    act(() => {
      result.current.updateItemVariant('item-1:base', {
        id: 'variant-black',
        color: { name: 'Preto' },
      });
    });
    act(() => result.current.addItem(item));
    act(() => {
      result.current.updateItemVariant('item-1:base', {
        id: 'variant-blue',
        color: { name: 'Azul' },
      });
    });

    expect(result.current.kitState.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lineId: 'item-1:variant-black', selectedVariantId: 'variant-black' }),
        expect.objectContaining({ lineId: 'item-1:variant-blue', selectedVariantId: 'variant-blue' }),
      ]),
    );
  });

  it('rejeita quantidades não inteiras ou não positivas sem alterar a linha', async () => {
    const { useKitBuilder } = await import('@/hooks/kit-builder/useKitBuilder');
    const { result } = renderHook(() => useKitBuilder({ initialFlow: 'items-first' }));

    act(() => result.current.addItem(item));
    act(() => result.current.updateItemQuantity('item-1:base', 0));
    act(() => result.current.updateItemQuantity('item-1:base', Number.NaN));
    act(() => result.current.updateItemQuantity('item-1:base', 1.5));

    expect(result.current.kitState.items).toEqual([
      expect.objectContaining({ lineId: 'item-1:base', quantity: 1 }),
    ]);
  });

  it('aplica a quantidade solicitada junto com a composição da IA', async () => {
    const { useKitBuilder } = await import('@/hooks/kit-builder/useKitBuilder');
    const { result } = renderHook(() => useKitBuilder());

    act(() => {
      result.current.applyAIComposition(
        {
          id: 'ai-1',
          name: 'Kit IA',
          narrative: 'Composição confirmada',
          kitType: 'montado',
          box,
          items: [item],
          unitPrice: 15,
          fitStatus: 'compatible',
        },
        50,
      );
    });

    expect(result.current.kitQuantity).toBe(50);
    expect(result.current.kitState.items).toHaveLength(1);
  });
});
