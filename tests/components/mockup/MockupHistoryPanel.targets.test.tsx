/**
 * A-33 — alvos de toque e legibilidade dos itens do MockupHistoryPanel.
 *
 * A VPS não tem navegador: jsdom não calcula layout (não há box model, então
 * `scrollWidth`/medições de px não valem nada aqui). A prova é estrutural, no
 * mesmo padrão de `src/components/ui/__tests__/ConfirmDialog.responsive.test.tsx`:
 *   1) todo botão de ação do painel carrega a altura de toque do kit (min-h-[44px])
 *      e nenhum carrega as classes compactas h-7/h-8/h-9 que derrubavam o alvo;
 *   2) ação só-ícone (regenerar/compartilhar/baixar/excluir, navegação e números
 *      de página) tem 44×44 (min-h + min-w);
 *   3) o checkbox de comparação — grade e lista — tem 44×44;
 *   4) nenhum texto dos itens usa tamanho arbitrário abaixo de 12px;
 *   5) em 375px todo container que segura vários alvos de 44px pode quebrar
 *      linha (flex-wrap) e a grade usa minmax(0, 1fr): nenhuma largura mínima
 *      empurra a página para a direita.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../render-helpers';
import { MockupHistoryPanel } from '@/components/mockup/MockupHistoryPanel';

// LayoutPopover real é um popover com radix; o teste precisa só das duas ações
// que ele oferece ao painel, para poder exercitar grade e lista.
vi.mock('@/components/products/LayoutPopover', () => ({
  LayoutPopover: ({ setViewMode }: { setViewMode: (mode: 'grid' | 'list' | 'table') => void }) => (
    <div>
      <button type="button" onClick={() => setViewMode('list')}>
        modo lista
      </button>
      <button type="button" onClick={() => setViewMode('grid')}>
        modo grade
      </button>
    </div>
  ),
}));

vi.mock('@/components/products/ColumnSelector', () => ({
  getDefaultColumns: () => 3,
}));

vi.mock('@/components/mockup/MockupCompareDialog', () => ({
  MockupCompareDialog: () => null,
}));

vi.mock('@/components/mockup/MockupLightbox', () => ({
  MockupLightbox: () => null,
}));

function setViewport(width: number, height = 900) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
  window.dispatchEvent(new Event('resize'));
}

// 13 itens = 2 páginas → a linha de paginação também é exercitada.
function makeMockups(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `m${i}`,
    product_id: `p${i}`,
    product_name: `Produto ${i}`,
    product_sku: `SKU-${i}`,
    technique_id: 't1',
    technique_name: 'Serigrafia',
    mockup_url: `https://example.com/mockup-${i}.jpg`,
    layout_url: i % 2 === 0 ? `https://example.com/layout-${i}.jpg` : null,
    logo_url: 'https://example.com/logo.png',
    position_x: 50,
    position_y: 50,
    logo_width_cm: 5,
    logo_height_cm: 3,
    location_name: 'Frente',
    colors_count: 1,
    created_at: new Date().toISOString(),
    client_id: 'c1',
    client_name: 'Cliente A',
    annotations: null,
  }));
}

const baseProps = {
  mockupHistory: makeMockups(13),
  isLoading: false,
  clients: [],
  onLoadFromHistory: vi.fn(),
  onDownload: vi.fn(),
  onDelete: vi.fn(),
};

function classesOf(el: Element | null): string[] {
  return (el?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
}

/** Altura de toque: min-h de 44px e nenhuma classe compacta h-7/h-8/h-9. */
function expectTouchHeight(el: HTMLElement) {
  const classes = classesOf(el);
  expect(classes).toContain('min-h-[44px]');
  expect(classes.filter((c) => /^(h|w)-[789]$/.test(c))).toEqual([]);
}

/** Alvo só-ícone: 44×44. */
function expectIconTarget(el: HTMLElement) {
  expectTouchHeight(el);
  expect(classesOf(el)).toContain('min-w-[44px]');
}

/** Botões de scaffolding do mock do LayoutPopover e o abridor da imagem (área
 *  do thumbnail, muito acima de 44px) não são ações do painel. */
function panelActionButtons(): HTMLElement[] {
  const scaffold = ['modo lista', 'modo grade'];
  return screen
    .getAllByRole('button')
    .filter(
      (b) =>
        !/^Abrir mockup de/.test(b.getAttribute('aria-label') ?? '') &&
        !scaffold.includes(b.textContent ?? ''),
    );
}

describe('MockupHistoryPanel — A-33 alvos de toque e legibilidade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('todo botão de ação do painel tem altura de toque de 44px', () => {
    renderWithProviders(<MockupHistoryPanel {...baseProps} />);
    const buttons = panelActionButtons();
    // 12 cards × 4 ações + paginação (primeira, anterior, 2 páginas, próxima, última)
    expect(buttons.length).toBeGreaterThanOrEqual(54);
    buttons.forEach((b) => expectTouchHeight(b));
  });

  it('ações só-ícone dos itens (regenerar/compartilhar/baixar/excluir) têm 44×44 na grade', () => {
    renderWithProviders(<MockupHistoryPanel {...baseProps} />);
    const labels = [
      /^Regenerar mockup de Produto 0$/,
      /^Baixar mockup de Produto 0$/,
      /^Excluir mockup de Produto 0$/,
    ];
    for (const label of labels) {
      const found = screen.getAllByRole('button', { name: label });
      expect(found.length).toBeGreaterThan(0);
      found.forEach((b) => expectIconTarget(b));
    }
    // o gatilho do ShareMenu vem do kit com size="sm" (36px) — o painel precisa
    // sobrescrever a altura E a largura para chegar a 44×44
    const share = screen.getAllByRole('button', { name: 'Compartilhar mockup' });
    expect(share.length).toBeGreaterThan(0);
    share.forEach((b) => expectIconTarget(b));
  });

  it('checkbox de comparação da grade tem alvo de 44×44 e continua acessível', () => {
    renderWithProviders(<MockupHistoryPanel {...baseProps} />);
    const targets = screen.getAllByRole('checkbox').map((box) => ({
      classes: classesOf(box),
      checked: box.getAttribute('aria-checked'),
      label: box.getAttribute('aria-label') ?? '',
    }));
    expect(targets).toHaveLength(12);
    // agrega TODOS os alvos de uma vez: nenhuma falha fica escondida atrás da primeira
    expect(targets.filter((t) => !t.classes.includes('h-11') || !t.classes.includes('w-11'))).toEqual(
      [],
    );
    expect(targets.filter((t) => t.classes.some((c) => /^(h|w)-[56789]$/.test(c)))).toEqual([]);
    expect(targets.filter((t) => t.checked !== 'false')).toEqual([]);
    expect(targets.filter((t) => !/^Selecionar Produto \d+ para comparação$/.test(t.label))).toEqual(
      [],
    );
  });

  it('na visão de lista as ações e o checkbox mantêm 44px', () => {
    renderWithProviders(<MockupHistoryPanel {...baseProps} />);
    fireEvent.click(screen.getByText('modo lista'));

    const listActions = screen.getAllByRole('button', { name: /^Regenerar mockup de Produto 0$/ });
    expect(listActions.length).toBe(1);
    expectIconTarget(listActions[0]);

    const checkboxClasses = screen.getAllByRole('checkbox').map((box) => classesOf(box));
    expect(checkboxClasses).toHaveLength(12);
    expect(checkboxClasses.filter((c) => !c.includes('h-11') || !c.includes('w-11'))).toEqual([]);
  });

  it('na visão de lista as ações não estouram a linha do item (44×44 com quebra)', () => {
    renderWithProviders(<MockupHistoryPanel {...baseProps} />);
    fireEvent.click(screen.getByText('modo lista'));
    const container = screen.getByRole('button', { name: /^Regenerar mockup de Produto 0$/ })
      .parentElement;
    expect(container).not.toBeNull();
    expect(classesOf(container)).toContain('flex-wrap');
    expect(classesOf(container).filter((c) => c === 'shrink-0')).toEqual([]);
  });

  it('nenhum texto dos itens fica abaixo de 12px', () => {
    renderWithProviders(<MockupHistoryPanel {...baseProps} />);

    const arbitrarySizes = [...document.body.innerHTML.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)].map(
      (m) => Number(m[1]),
    );
    expect(arbitrarySizes.filter((size) => size < 12)).toEqual([]);

    // textos de apoio do item usam a escala do design system (>= 12px)
    for (const el of screen.getAllByText('Serigrafia')) expect(classesOf(el)).toContain('text-xs');
    for (const el of screen.getAllByText('Frente')) expect(classesOf(el)).toContain('text-xs');
    for (const el of screen.getAllByText('SKU-0')) expect(classesOf(el)).toContain('text-xs');
    for (const el of screen.getAllByText('5.0×3.0 cm')) expect(classesOf(el)).toContain('text-xs');
    for (const el of screen.getAllByText('Layout')) expect(classesOf(el)).toContain('text-xs');
  });

  it('em 375px os containers de ações quebram linha e a grade pode encolher', () => {
    setViewport(375);
    renderWithProviders(<MockupHistoryPanel {...baseProps} />);

    // cabeçalho: título + controles (badge/Comparar/LayoutPopover)
    const title = screen.getByText('Histórico de Mockups');
    const headerRow = title.parentElement?.parentElement;
    expect(headerRow).not.toBeNull();
    expect(classesOf(headerRow)).toContain('flex-wrap');

    // linha de ações do card: 4 alvos de 44px cabem quebrando linha e nunca
    // passam da largura do card
    const gridActions = screen.getByRole('button', { name: /^Regenerar mockup de Produto 0$/ })
      .parentElement;
    expect(gridActions).not.toBeNull();
    expect(classesOf(gridActions)).toContain('flex-wrap');
    expect(classesOf(gridActions).some((c) => c.startsWith('max-w-['))).toBe(true);

    // grade: minmax(0, 1fr) permite a coluna encolher abaixo do conteúdo
    const grid = document.querySelector('[style*="grid-template-columns"]');
    expect(grid).not.toBeNull();
    expect(grid?.getAttribute('style')).toContain('minmax(0, 1fr)');

    // paginação: 3 rótulos + 8 alvos de 44px não cabem em 375px numa linha só
    const pagination = screen.getByRole('button', { name: 'Primeira' }).parentElement;
    expect(pagination).not.toBeNull();
    expect(classesOf(pagination)).toContain('flex-wrap');

    // visão de lista: a linha do item também não pode ser empurrada
    fireEvent.click(screen.getByText('modo lista'));
    const listActions = screen.getByRole('button', { name: /^Regenerar mockup de Produto 0$/ })
      .parentElement;
    expect(classesOf(listActions ?? null)).toContain('flex-wrap');
  });
});
