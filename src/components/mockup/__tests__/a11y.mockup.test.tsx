import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from '../../../../tests/a11y/axe-helper';

// ── Dados de teste (hoisted para poderem ser usados dentro dos vi.mock) ──────
const { mockProduct, mockVariants } = vi.hoisted(() => ({
  mockProduct: {
    id: 'prod-1',
    name: 'Caneca Cerâmica Branca',
    sku: 'CAN-001',
    images: ['https://cdn.example.com/caneca.png'],
  },
  mockVariants: [
    {
      id: 'var-1',
      product_id: 'prod-1',
      sku: 'CAN-001-AZ',
      supplier_sku: null,
      color_code: 'AZ',
      color_name: 'Azul',
      color_hex: '#0000ff',
      size_code: null,
      stock_quantity: 120,
      next_entry_date: null,
      next_entry_quantity: null,
      selected_thumbnail: 'https://cdn.example.com/caneca-azul.png',
      images: ['https://cdn.example.com/caneca-azul.png'],
      bitrix_product_id: null,
    },
    {
      id: 'var-2',
      product_id: 'prod-1',
      sku: 'CAN-001-VM',
      supplier_sku: null,
      color_code: 'VM',
      color_name: 'Vermelho',
      color_hex: '#ff0000',
      size_code: null,
      stock_quantity: 0,
      next_entry_date: null,
      next_entry_quantity: null,
      selected_thumbnail: null,
      images: null,
      bitrix_product_id: null,
    },
  ],
}));

vi.mock('@/hooks/products', () => ({
  useProduct: () => ({ data: mockProduct, isLoading: false }),
  useExternalVariantStock: () => ({ data: mockVariants, isLoading: false }),
}));

import { ProductSearchCombobox } from '../ProductSearchCombobox';
import { ProductLoaderAndColorSelector } from '../MockupColorSelector';
import { LogoSizeControls } from '../logo-editor/LogoSizeControls';

// ============================================================================
// 1) ProductSearchCombobox — busca como combobox acessível
// ============================================================================
describe('ProductSearchCombobox — a11y', () => {
  const products = [
    { id: 'p1', name: 'Caneca Azul', sku: 'CAN-AZ' },
    { id: 'p2', name: 'Caneca Vermelha', sku: 'CAN-VM' },
  ];

  function renderCombobox(overrides: Record<string, unknown> = {}) {
    return render(
      <ProductSearchCombobox
        products={products}
        search=""
        onSearchChange={() => {}}
        selectedProduct={null}
        onSelect={() => {}}
        {...overrides}
      />,
    );
  }

  it('não tem violações axe no estado fechado', async () => {
    const { container } = renderCombobox();
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('não tem violações axe no estado aberto (lista exposta)', async () => {
    renderCombobox();
    fireEvent.click(screen.getByTestId('mockup-product-combobox-trigger'));
    await screen.findByTestId('mockup-product-search-input');
    // O Popover renderiza em portal no document.body — fora do `container` do render.
    expect(document.body.querySelector('[role="listbox"]')).not.toBeNull();
    const results = await axe(document.body);
    expect(results.violations).toEqual([]);
  });

  it('não tem violações axe com um produto já selecionado', async () => {
    const { container } = renderCombobox({ selectedProduct: products[0] });
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('o gatilho expõe nome acessível e estado expandido', () => {
    renderCombobox();
    const trigger = screen.getByTestId('mockup-product-combobox-trigger');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    // Nome acessível explícito (não depende do texto interno mudar com a seleção).
    expect(trigger).toHaveAccessibleName(/buscar produto/i);
  });

  it('permite navegação por teclado completa: abrir, focar a busca, percorrer e selecionar', async () => {
    const onSelect = vi.fn();
    const onSearchChange = vi.fn();
    const user = userEvent.setup();
    // Um único resultado torna a seleção determinística (cmdk auto-seleciona o 1º item).
    renderCombobox({ onSelect, onSearchChange, products: [products[0]] });

    const trigger = screen.getByTestId('mockup-product-combobox-trigger');
    trigger.focus();
    expect(trigger).toHaveFocus();

    // Abrir com Enter (teclado, sem mouse).
    await user.keyboard('{Enter}');
    const input = await screen.findByTestId('mockup-product-search-input');
    expect(input).toHaveFocus();

    // Digitar filtra (o caller é quem filtra; aqui provamos que a digitação chega ao caller).
    await user.keyboard('Caneca');
    expect(onSearchChange).toHaveBeenCalled();

    // Percorrer a lista com a seta e confirmar com Enter.
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toMatchObject({ id: 'p1' });
  });

  it('Esc fecha apenas a camada ativa (o popover) sem selecionar nada', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    renderCombobox({ onSelect });

    await user.click(screen.getByTestId('mockup-product-combobox-trigger'));
    await screen.findByTestId('mockup-product-search-input');

    await user.keyboard('{Escape}');

    expect(screen.queryByTestId('mockup-product-search-input')).not.toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('alvo de toque do gatilho tem no mínimo 44px de altura', () => {
    renderCombobox();
    const trigger = screen.getByTestId('mockup-product-combobox-trigger');
    expect(trigger.className).toMatch(/min-h-\[44px\]/);
  });

  it('o spinner de carregamento respeita prefers-reduced-motion', async () => {
    renderCombobox({ isSearching: true });
    fireEvent.click(screen.getByTestId('mockup-product-combobox-trigger'));
    await screen.findByTestId('mockup-product-search-input');

    // O conteúdo do Popover é renderizado em portal (document.body), fora do container.
    const spinner = document.querySelector('svg[aria-hidden="true"].animate-spin');
    expect(spinner).not.toBeNull();
    expect(spinner!.getAttribute('class')).toMatch(/motion-reduce:animate-none/);
  });
});

// ============================================================================
// 2) MockupColorSelector (ProductLoaderAndColorSelector) — seleção de cor
// ============================================================================
describe('MockupColorSelector — a11y', () => {
  function renderSelector() {
    return render(
      <ProductLoaderAndColorSelector productId="prod-1" onSelect={() => {}} onBack={() => {}} />,
    );
  }

  it('não tem violações axe', async () => {
    const { container } = renderSelector();
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('cada variante é um botão com nome acessível (cor + estoque)', () => {
    renderSelector();
    const azul = screen.getByRole('button', { name: /azul/i });
    expect(azul).toHaveAccessibleName(/estoque|dispon/i);
  });

  it('o estado de estoque zerado é anunciado pelo nome acessível', () => {
    renderSelector();
    const vermelho = screen.getByRole('button', { name: /vermelho/i });
    expect(vermelho).toHaveAccessibleName(/esgotado|estoque zerado|indispon/i);
  });

  it('alvos de toque das variantes têm no mínimo 44px', () => {
    renderSelector();
    const azul = screen.getByRole('button', { name: /azul/i });
    expect(azul.className).toMatch(/min-h-\[44px\]/);
  });

  it('a variante expõe foco visível (WCAG 2.4.7) e respeita prefers-reduced-motion', () => {
    renderSelector();
    const azul = screen.getByRole('button', { name: /azul/i });
    expect(azul.className).toMatch(/focus-visible:ring-2/);
    expect(azul.className).toMatch(/focus-visible:ring-primary/);
    expect(azul.className).toMatch(/motion-reduce:transition-none/);
  });
});

// ============================================================================
// 3) LogoSizeControls — sliders com nome acessível
// ============================================================================
describe('LogoSizeControls — a11y', () => {
  function renderControls(props: { onSizeChange?: (w: number, h: number) => void } = {}) {
    return render(
      <LogoSizeControls
        logoPreview="data:image/png;base64,AAAA"
        logoWidth={5}
        logoHeight={4}
        logoScale={100}
        logoRotation={0}
        positionX={50}
        positionY={50}
        maxWidth={10}
        maxHeight={8}
        onSizeChange={props.onSizeChange ?? (() => {})}
        onLogoScaleChange={() => {}}
      />,
    );
  }

  it('não tem violações axe', async () => {
    const { container } = renderControls();
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('os três sliders têm nome acessível distinto', () => {
    renderControls();
    const sliders = screen.getAllByRole('slider');
    expect(sliders).toHaveLength(3);
    expect(screen.getByRole('slider', { name: /largura/i })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: /altura/i })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: /escala/i })).toBeInTheDocument();
  });

  it('os botões +/− têm nome acessível', () => {
    renderControls();
    expect(screen.getByRole('button', { name: /diminuir largura/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /aumentar largura/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /diminuir altura/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /aumentar altura/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /diminuir escala/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /aumentar escala/i })).toBeInTheDocument();
  });

  it('os botões +/− são operáveis por teclado e expõem foco visível (WCAG 2.4.7)', async () => {
    const onSizeChange = vi.fn();
    const user = userEvent.setup();
    renderControls({ onSizeChange });

    const inc = screen.getByRole('button', { name: /aumentar largura/i });
    inc.focus();
    expect(inc).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onSizeChange).toHaveBeenCalledTimes(1);
    expect(inc.className).toMatch(/focus-visible:ring-2/);
  });

  it('o slider de largura é operável por teclado (seta altera o valor)', async () => {
    const onSizeChange = vi.fn();
    const user = userEvent.setup();
    renderControls({ onSizeChange });

    const largura = screen.getByRole('slider', { name: /largura/i });
    largura.focus();
    expect(largura).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(onSizeChange).toHaveBeenCalled();
  });
});
