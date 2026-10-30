import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { KitSummary } from '@/components/kit-builder/KitSummary';
import type { KitState } from '@/lib/kit-builder';

vi.mock('@/hooks/kit-builder', () => ({
  useKitStockValidation: () => ({
    alerts: [],
    stockByProduct: new Map(),
    hasStockIssues: false,
    stockStatus: 'available',
  }),
}));

vi.mock('@/components/kit-builder/FreightEstimator', () => ({
  FreightEstimator: ({ itemsWithUnknownWeight }: { itemsWithUnknownWeight: number }) => (
    <output data-testid="unknown-weight-count">{itemsWithUnknownWeight}</output>
  ),
}));

vi.mock('@/components/kit-builder/KitMarginSimulator', () => ({ KitMarginSimulator: () => null }));
vi.mock('@/components/kit-builder/KitVisualPreview', () => ({ KitVisualPreview: () => null }));
vi.mock('@/components/kit-builder/DiscontinuedItemsAlert', () => ({
  DiscontinuedItemsAlert: () => null,
}));
vi.mock('@/components/kit-builder/KitConflictAlerts', () => ({ KitConflictAlerts: () => null }));
vi.mock('@/components/kit-builder/KitPresentablePreview', () => ({
  KitPresentablePreview: () => null,
}));
vi.mock('@/components/kit-builder/KitPersonalizationPreview', () => ({
  KitPersonalizationPreview: () => null,
}));
vi.mock('@/components/kit-builder/KitStockForecastCard', () => ({
  KitStockForecastCard: () => null,
}));
vi.mock('@/components/kit-builder/kit-summary/KitIdentificationCard', () => ({
  KitIdentificationCard: () => null,
}));
vi.mock('@/components/kit-builder/kit-summary/KitStatsCards', () => ({
  KitStatsCards: () => null,
}));
vi.mock('@/components/kit-builder/kit-summary/KitCompositionCard', () => ({
  KitCompositionCard: () => null,
}));
vi.mock('@/components/kit-builder/kit-summary/KitPricingCard', () => ({
  KitPricingCard: () => null,
}));
vi.mock('@/components/kit-builder/kit-summary/KitActionsBar', () => ({
  KitActionsBar: () => null,
}));
vi.mock('@/components/kit-builder/kit-summary/KitValidationChecklist', () => ({
  KitValidationChecklist: () => null,
}));
vi.mock('@/components/quotes/ClientPicker', () => ({ ClientPicker: () => null }));

describe('KitSummary — propaga peso desconhecido ao estimador de frete', () => {
  it('conta zero, ausente e caixa sem peso, sem tratar zero como medição', () => {
    const kitState = {
      name: 'Kit teste',
      kitType: 'montado',
      box: { id: 'box-1', name: 'Caixa', sku: 'CX-1', imageUrl: null, price: 10, weight: 0 },
      items: [
        {
          id: 'item-1',
          name: 'Item zero',
          sku: 'IT-1',
          imageUrl: null,
          price: 5,
          quantity: 1,
          weight: 0,
        },
        { id: 'item-2', name: 'Item sem peso', sku: 'IT-2', imageUrl: null, price: 5, quantity: 1 },
      ],
      personalization: { box: { enabled: false }, items: {} },
      totalItemsVolume: 0,
      availableVolume: 0,
      volumeUsagePercent: 0,
      totalWeight: 0,
      boxPrice: 10,
      itemsPrice: 10,
      personalizationPrice: 0,
      totalPrice: 20,
      isValid: true,
      validationErrors: [],
    } as unknown as KitState;

    render(
      <KitSummary
        kitState={kitState}
        kitQuantity={1}
        kitName="Kit teste"
        onKitNameChange={vi.fn()}
        onKitQuantityChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId('unknown-weight-count')).toHaveTextContent('3');
  });
});
