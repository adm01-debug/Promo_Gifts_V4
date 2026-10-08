/**
 * Paginação e seleção de comparação do MockupHistoryPanel.
 *
 * Prova (Codex M24 / plano etapa 63): excluir o último item da última página não
 * pode deixar a página atual acima do novo total; item removido sai da seleção de
 * comparação; a comparação aceita no máximo 3 itens COM o checkbox visível.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../render-helpers';
import React from 'react';
import type { GeneratedMockup } from '@/hooks/mockup/mockupGenerationService';

vi.mock('@/components/products/LayoutPopover', () => ({
  LayoutPopover: () => null,
}));

vi.mock('@/components/products/ColumnSelector', () => ({
  getDefaultColumns: vi.fn().mockReturnValue(3),
}));

vi.mock('@/components/loading/ModernSkeletons', () => ({
  MockupHistorySkeleton: () => null,
}));

vi.mock('@/components/mockup/MockupCompareDialog', () => ({
  MockupCompareDialog: () => null,
}));

vi.mock('@/components/mockup/ShareMenu', () => ({
  ShareMenu: () => null,
}));

vi.mock('@/components/mockup/MockupLightbox', () => ({
  MockupLightbox: () => null,
}));

function makeMockup(index: number): GeneratedMockup {
  return {
    id: `m${index}`,
    product_id: `p${index}`,
    product_name: `Produto ${index}`,
    product_sku: `SKU-${index}`,
    technique_id: 't1',
    technique_name: 'Laser',
    mockup_url: `https://example.com/mockup-${index}.jpg`,
    layout_url: null,
    logo_url: null,
    position_x: 50,
    position_y: 50,
    logo_width_cm: 5,
    logo_height_cm: 3,
    location_name: 'Frente',
    colors_count: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    client_id: null,
    client_name: null,
    annotations: null,
  };
}

const baseProps = {
  isLoading: false,
  clients: [],
  onLoadFromHistory: vi.fn(),
  onDownload: vi.fn(),
  onDelete: vi.fn(),
};

const checkboxFor = (index: number) =>
  screen.getByRole('checkbox', { name: `Selecionar Produto ${index} para comparação` });

describe('MockupHistoryPanel — paginação e comparação', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('excluir o último item da última página volta para uma página válida', async () => {
    const { MockupHistoryPanel } = await import('@/components/mockup/MockupHistoryPanel');
    const historico = Array.from({ length: 13 }, (_, i) => makeMockup(i + 1));

    const { rerender } = renderWithProviders(
      <MockupHistoryPanel {...baseProps} mockupHistory={historico} />,
    );

    expect(screen.getByText('1-12 de 13')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Última' }));
    expect(screen.getByText('13-13 de 13')).toBeInTheDocument();

    // O item 13 é excluído: a lista encolhe para 12 e a página 2 deixa de existir.
    rerender(<MockupHistoryPanel {...baseProps} mockupHistory={historico.slice(0, 12)} />);

    expect(screen.getByText('1-12 de 12')).toBeInTheDocument();
  });

  it('item removido sai da seleção de comparação', async () => {
    const { MockupHistoryPanel } = await import('@/components/mockup/MockupHistoryPanel');
    const dois = [makeMockup(1), makeMockup(2)];

    const { rerender } = renderWithProviders(
      <MockupHistoryPanel {...baseProps} mockupHistory={dois} />,
    );

    fireEvent.click(checkboxFor(1));
    fireEvent.click(checkboxFor(2));
    expect(screen.getByText('2 selecionados')).toBeInTheDocument();

    // Item 2 excluído: não pode continuar contando na comparação.
    rerender(<MockupHistoryPanel {...baseProps} mockupHistory={[dois[0]]} />);

    expect(
      screen.queryByRole('checkbox', { name: 'Selecionar Produto 2 para comparação' }),
    ).toBeNull();
    expect(screen.getByText('1 selecionados')).toBeInTheDocument();
  });

  it('comparar aceita no máximo 3 itens e mantém o checkbox visível', async () => {
    const { MockupHistoryPanel } = await import('@/components/mockup/MockupHistoryPanel');
    const quatro = Array.from({ length: 4 }, (_, i) => makeMockup(i + 1));

    renderWithProviders(<MockupHistoryPanel {...baseProps} mockupHistory={quatro} />);

    for (let i = 1; i <= 4; i += 1) {
      fireEvent.click(checkboxFor(i));
    }

    expect(screen.getByText('3 selecionados')).toBeInTheDocument();

    // No limite, o 4º checkbox segue visível e utilizável (não é escondido/desabilitado).
    const quarto = checkboxFor(4);
    expect(quarto).toBeVisible();
    expect(quarto).toBeEnabled();
    expect(quarto).toHaveAttribute('aria-checked', 'false');
    expect(quarto.className).not.toContain('hidden');

    fireEvent.click(quarto);
    expect(screen.getByText('3 selecionados')).toBeInTheDocument();
  });
});
