import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../render-helpers';
import { KitMobileSummaryBar } from '@/components/kit-builder/KitMobileSummaryBar';
import type { KitState } from '@/lib/kit-builder';

const kitState: KitState = {
  name: 'Kit mobile',
  kitType: 'montado',
  box: null,
  items: [],
  personalization: { box: { enabled: false }, items: {} },
  totalItemsVolume: 0,
  availableVolume: 0,
  volumeUsagePercent: 0,
  totalWeight: 0,
  boxPrice: 0,
  itemsPrice: 0,
  personalizationPrice: 0,
  totalPrice: 125,
  isValid: false,
  validationErrors: [],
};

describe('KitMobileSummaryBar', () => {
  it('mantém um único botão interativo no gatilho do drawer', () => {
    renderWithProviders(
      <KitMobileSummaryBar kitState={kitState} kitQuantity={3}>
        <p>Conteúdo do resumo</p>
      </KitMobileSummaryBar>,
    );

    const trigger = screen.getByRole('button', { name: 'Abrir resumo do kit' });
    expect(trigger.querySelector('button')).toBeNull();
    expect(trigger.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});
