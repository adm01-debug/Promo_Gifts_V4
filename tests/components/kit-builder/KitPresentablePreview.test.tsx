import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../render-helpers';
import { KitPresentablePreview } from '@/components/kit-builder/KitPresentablePreview';
import type { KitState } from '@/lib/kit-builder';

const kitState: KitState = {
  name: 'Kit corporativo',
  kitType: 'montado',
  box: {
    id: 'box-1',
    name: 'Caixa',
    sku: 'CX-1',
    imageUrl: null,
    price: 20,
    internalWidth: 30,
    internalHeight: 20,
    internalDepth: 10,
    internalVolume: 6000,
  },
  items: [],
  personalization: { box: { enabled: false }, items: {} },
  totalItemsVolume: 0,
  availableVolume: 4500,
  volumeUsagePercent: 0,
  totalWeight: 0,
  boxPrice: 2000,
  itemsPrice: 0,
  personalizationPrice: 0,
  totalPrice: 2000,
  isValid: true,
  validationErrors: [],
};

describe('KitPresentablePreview', () => {
  it('não multiplica novamente o total do lote no investimento', () => {
    renderWithProviders(
      <KitPresentablePreview kitState={kitState} kitQuantity={100} kitName="Kit corporativo" />,
    );

    const investment = screen.getByText('Investimento').parentElement;
    expect(investment).toHaveTextContent(/R\$\s?2\.000,00/);
    expect(investment).not.toHaveTextContent(/R\$\s?200\.000,00/);
  });
});
