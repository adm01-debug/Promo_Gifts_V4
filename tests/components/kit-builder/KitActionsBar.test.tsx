import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../render-helpers';
import { KitActionsBar } from '@/components/kit-builder/kit-summary/KitActionsBar';

describe('KitActionsBar', () => {
  it('bloqueia criação de orçamento quando a validação de estoque encontrou déficit', () => {
    renderWithProviders(
      <KitActionsBar
        isValid
        hasStockIssues
        kitName="Kit teste"
        kitQuantity={10}
        unitPrice={20}
        total={200}
        items={[]}
        onAddToQuote={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Estoque insuficiente' })).toBeDisabled();
  });

  it('diferencia estoque ainda verificando de estoque inconclusivo', () => {
    const { rerender } = renderWithProviders(
      <KitActionsBar
        isValid
        hasStockIssues
        stockStatus="checking"
        kitName="Kit teste"
        kitQuantity={10}
        unitPrice={20}
        total={200}
        items={[]}
      />,
    );
    expect(screen.getByRole('button', { name: 'Verificando estoque' })).toBeDisabled();

    rerender(
      <KitActionsBar
        isValid
        hasStockIssues
        stockStatus="unknown"
        kitName="Kit teste"
        kitQuantity={10}
        unitPrice={20}
        total={200}
        items={[]}
      />,
    );
    expect(screen.getByRole('button', { name: 'Estoque não confirmado' })).toBeDisabled();
  });
});
