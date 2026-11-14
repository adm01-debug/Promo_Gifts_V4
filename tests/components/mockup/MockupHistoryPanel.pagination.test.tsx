/**
 * Reconciliação do MockupHistoryPanel quando a lista encolhe (item excluído).
 *
 * Sem a correção: a página atual ficava acima do novo total e a grade
 * renderizava vazia; e um mockup já apagado continuava contando na seleção de
 * comparação.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../render-helpers';
import type { GeneratedMockup } from '@/hooks/mockup/mockupGenerationService';

vi.mock('@/components/products/LayoutPopover', () => ({
  LayoutPopover: () => null,
}));

vi.mock('@/components/products/ColumnSelector', () => ({
  ColumnSelector: () => null,
  getDefaultColumns: vi.fn().mockReturnValue(3),
}));

vi.mock('@/components/loading/ModernSkeletons', () => ({
  MockupHistorySkeleton: () => null,
}));

vi.mock('@/components/mockup/MockupCompareDialog', () => ({
  MockupCompareDialog: () => null,
}));

vi.mock('@/components/mockup/MockupLightbox', () => ({
  MockupLightbox: () => null,
}));

vi.mock('@/components/mockup/ShareMenu', () => ({
  ShareMenu: () => null,
}));

import { MockupHistoryPanel } from '@/components/mockup/MockupHistoryPanel';

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

describe('MockupHistoryPanel — reconciliação após excluir', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('excluir o último item da última página volta para uma página válida', () => {
    // 13 itens com ITEMS_PER_PAGE=12 → 2 páginas; a página 2 tem 1 item.
    const historico = Array.from({ length: 13 }, (_, i) => makeMockup(i + 1));

    const { rerender } = renderWithProviders(
      <MockupHistoryPanel {...baseProps} mockupHistory={historico} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Última' }));
    expect(screen.getByText('Produto 13')).toBeInTheDocument();
    expect(screen.queryByText('Produto 1')).not.toBeInTheDocument();

    // O item 13 é excluído: a lista encolhe para 12 e a página 2 deixa de existir.
    rerender(<MockupHistoryPanel {...baseProps} mockupHistory={historico.slice(0, 12)} />);

    // Sem a reconciliação, a grade ficaria em branco na página 2 inexistente.
    expect(screen.getByText('Produto 1')).toBeInTheDocument();
    expect(screen.getByText('Produto 12')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Última' })).toBeNull();
  });

  it('item removido sai da seleção de comparação', () => {
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

  it('esvaziar a seleção ao excluir o único item selecionado sai do modo comparação', () => {
    const dois = [makeMockup(1), makeMockup(2)];

    const { rerender } = renderWithProviders(
      <MockupHistoryPanel {...baseProps} mockupHistory={dois} />,
    );

    fireEvent.click(checkboxFor(2));
    expect(screen.getByText('1 selecionados')).toBeInTheDocument();

    rerender(<MockupHistoryPanel {...baseProps} mockupHistory={[dois[0]]} />);

    expect(screen.queryByText(/selecionados$/)).toBeNull();
    expect(screen.queryByRole('button', { name: /Comparar/ })).toBeNull();
  });

  it('a comparação continua aceitando até 4 itens (regra de negócio do main)', () => {
    const cinco = Array.from({ length: 5 }, (_, i) => makeMockup(i + 1));

    renderWithProviders(<MockupHistoryPanel {...baseProps} mockupHistory={cinco} />);

    for (let i = 1; i <= 5; i += 1) fireEvent.click(checkboxFor(i));

    expect(screen.getByText('4 selecionados')).toBeInTheDocument();
  });
});
