/**
 * A-33 — alvos de toque e legibilidade do MockupHistoryPanel (paginação,
 * limpar filtros e textos dos itens).
 *
 * jsdom não calcula layout (sem box model, medir px não vale nada aqui), então
 * — como em MockupHistoryPanel.actions.test.tsx (A-5) — o contrato é verificado
 * pelas classes aplicadas. Sem a correção: paginação e "Limpar filtros" usavam
 * `size="sm"` (36px) ou `h-8 w-8` (32px), as linhas de controle não quebravam em
 * 375px e os textos de apoio dos itens ficavam em 9px/10px.
 *
 * As ações do item (regenerar/compartilhar/baixar/excluir) e o checkbox de
 * comparação são cobertos por MockupHistoryPanel.actions.test.tsx — o checkbox
 * chega a 44px pelo `after:-inset-2.5` do main, sem ampliar os 24px visuais.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../render-helpers';
import type { GeneratedMockup } from '@/hooks/mockup/mockupGenerationService';

vi.mock('@/components/products/ColumnSelector', () => ({
  ColumnSelector: () => null,
  getDefaultColumns: vi.fn().mockReturnValue(3),
}));

vi.mock('@/components/products/LayoutPopover', () => ({
  LayoutPopover: ({ setViewMode }: { setViewMode: (m: 'grid' | 'list' | 'table') => void }) => (
    <button type="button" data-testid="go-list-view" onClick={() => setViewMode('list')}>
      Lista
    </button>
  ),
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

import { MockupHistoryPanel } from '@/components/mockup/MockupHistoryPanel';

function makeMockup(index: number): GeneratedMockup {
  return {
    id: `m${index}`,
    product_id: `p${index}`,
    product_name: `Produto ${index}`,
    product_sku: `SKU-${index}`,
    technique_id: 't1',
    technique_name: 'Serigrafia',
    mockup_url: `https://example.com/mockup-${index}.jpg`,
    layout_url: index % 2 === 0 ? `https://example.com/layout-${index}.jpg` : null,
    logo_url: 'https://example.com/logo.png',
    position_x: 50,
    position_y: 50,
    logo_width_cm: 5,
    logo_height_cm: 3,
    location_name: 'Frente',
    colors_count: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    client_id: 'c1',
    client_name: 'Cliente A',
    annotations: null,
  };
}

// 13 itens = 2 páginas → a linha de paginação também é renderizada.
const baseProps = {
  mockupHistory: Array.from({ length: 13 }, (_, i) => makeMockup(i)),
  isLoading: false,
  clients: [],
  onLoadFromHistory: vi.fn(),
  onDownload: vi.fn(),
  onDelete: vi.fn(),
};

const classesOf = (el: Element | null): string[] =>
  (el?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);

/** Altura de toque do kit: min-h-[44px] e nenhuma classe compacta h-7/h-8/h-9. */
function expectTouchHeight(el: HTMLElement, label: string) {
  const classes = classesOf(el);
  expect(classes, `alvo < 44px em ${label}`).toContain('min-h-[44px]');
  expect(
    classes.filter((c) => /^(h|w)-[789]$/.test(c)),
    `classe compacta em ${label}`,
  ).toEqual([]);
}

const PAGINATION_LABELS = ['Primeira', 'Última', '1', '2'];

describe('MockupHistoryPanel — A-33 paginação, limpar filtros e legibilidade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('botões de paginação com rótulo têm alvo de 44px', () => {
    renderWithProviders(<MockupHistoryPanel {...baseProps} />);
    for (const name of PAGINATION_LABELS) {
      expectTouchHeight(screen.getByRole('button', { name }), name);
    }
  });

  it('botões só-ícone da paginação têm 44×44', () => {
    renderWithProviders(<MockupHistoryPanel {...baseProps} />);
    for (const name of ['Página anterior', 'Próxima página']) {
      const btn = screen.getByRole('button', { name });
      expectTouchHeight(btn, name);
      expect(classesOf(btn), `largura < 44px em ${name}`).toContain('min-w-[44px]');
    }
  });

  it('a linha de paginação pode quebrar em tela estreita', () => {
    renderWithProviders(<MockupHistoryPanel {...baseProps} />);
    const pagination = screen.getByRole('button', { name: 'Primeira' }).parentElement;
    expect(pagination).not.toBeNull();
    expect(classesOf(pagination)).toContain('flex-wrap');
  });

  it('"Limpar filtros" tem alvo de 44px nos dois lugares em que aparece', async () => {
    renderWithProviders(<MockupHistoryPanel {...baseProps} />);
    const campoProduto = screen.getByPlaceholderText('Buscar por nome ou SKU...');

    // Filtro aplicado → aparece o botão ghost acima da grade.
    fireEvent.change(campoProduto, { target: { value: 'Produto 0' } });
    expectTouchHeight(
      await screen.findByRole('button', { name: /Limpar filtros/ }),
      'Limpar filtros (com resultados)',
    );

    // Filtro sem resultado → aparece também o botão outline do estado vazio.
    fireEvent.change(campoProduto, { target: { value: 'inexistente-zzz' } });
    expect(await screen.findByText('Nenhum resultado')).toBeInTheDocument();
    const botoes = screen.getAllByRole('button', { name: /Limpar filtros/ });
    expect(botoes).toHaveLength(2);
    for (const btn of botoes) expectTouchHeight(btn, 'Limpar filtros (estado vazio)');
  });

  it('controles de comparação no cabeçalho têm alvo de 44px e a linha quebra', () => {
    renderWithProviders(<MockupHistoryPanel {...baseProps} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Selecionar Produto 0 para comparação' }));

    expectTouchHeight(screen.getByRole('button', { name: /Comparar/ }), 'Comparar');
    const cancelar = screen.getByRole('button', { name: 'Cancelar seleção para comparação' });
    expectTouchHeight(cancelar, 'Cancelar seleção');
    expect(classesOf(cancelar)).toContain('min-w-[44px]');

    const headerRow = screen.getByText('Histórico de Mockups').parentElement?.parentElement;
    expect(classesOf(headerRow ?? null)).toContain('flex-wrap');
  });

  it('nenhum texto do painel fica abaixo de 12px, na grade e na lista', () => {
    const { container } = renderWithProviders(<MockupHistoryPanel {...baseProps} />);

    const sizesOf = () =>
      [...container.innerHTML.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)].map((m) => Number(m[1]));
    expect(sizesOf().filter((size) => size < 12)).toEqual([]);

    // Textos de apoio do item usam a escala do design system (text-xs = 12px).
    for (const el of screen.getAllByText('SKU-0')) expect(classesOf(el)).toContain('text-xs');
    for (const el of screen.getAllByText('Serigrafia')) expect(classesOf(el)).toContain('text-xs');
    for (const el of screen.getAllByText('Frente')) expect(classesOf(el)).toContain('text-xs');
    for (const el of screen.getAllByText('Layout')) expect(classesOf(el)).toContain('text-xs');

    fireEvent.click(screen.getByTestId('go-list-view'));
    expect(sizesOf().filter((size) => size < 12)).toEqual([]);
    for (const el of screen.getAllByText('5.0×3.0 cm')) expect(classesOf(el)).toContain('text-xs');
  });
});
