import { render, screen, fireEvent } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import { ItemSelector } from '@/components/kit-builder/ItemSelector';
import type { KitItem } from '@/lib/kit-builder';

vi.mock('@/components/kit-builder/KitSmartSuggestions', () => ({
  KitSmartSuggestions: () => null,
}));

const ITEM_A: KitItem & { compatibility: null } = {
  id: 'p1',
  name: 'Caderno',
  sku: 'CAD',
  imageUrl: null,
  price: 25,
  quantity: 1,
  category: 'Escritório',
  material: 'Papel',
  width: 18,
  height: 12,
  depth: 1,
  volume: 216,
  compatibility: null,
};

const ITEM_B: KitItem & { compatibility: null } = {
  ...ITEM_A,
  id: 'p2',
  name: 'Caneta',
  category: 'Escrita',
};

function baseProps(overrides: Partial<React.ComponentProps<typeof ItemSelector>> = {}) {
  return {
    items: [ITEM_A, ITEM_B],
    selectedItems: [],
    isLoading: false,
    filters: {},
    onFiltersChange: vi.fn(),
    onAddItem: () => ({ fits: true }),
    onRemoveItem: vi.fn(),
    onUpdateQuantity: vi.fn(),
    onUpdateVariant: vi.fn(),
    boxSelected: false,
    ...overrides,
  };
}

describe('ItemSelector parity', () => {
  it('renders category chips instead of a select', () => {
    render(<ItemSelector {...baseProps()} />);
    expect(screen.getByRole('group', { name: /categorias/i })).toBeInTheDocument();
    expect(screen.getByText('Todos')).toBeInTheDocument();
    expect(screen.getByText('Escritório')).toBeInTheDocument();
    expect(screen.getByText('Escrita')).toBeInTheDocument();
  });

  it('shows the "X de Y produtos" counter', () => {
    render(<ItemSelector {...baseProps({ totalCount: 50 })} />);
    expect(screen.getByText('2 de 50 produtos')).toBeInTheDocument();
  });

  it('shows the journey badge when flow is provided', () => {
    render(<ItemSelector {...baseProps({ flow: 'items-first' })} />);
    expect(screen.getByText('Fluxo 1 · Começar pelos itens')).toBeInTheDocument();
  });

  it('toggles between grid and list view', () => {
    render(<ItemSelector {...baseProps()} />);
    const listButton = screen.getByRole('button', { name: /ver em lista/i });
    fireEvent.click(listButton);
    expect(listButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onClearAll after confirming the destructive dialog', () => {
    const onClearAll = vi.fn();
    render(
      <ItemSelector {...baseProps({ selectedItems: [ITEM_A], onClearAll })} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /limpar tudo/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Limpar tudo' }));
    expect(onClearAll).toHaveBeenCalled();
  });

  it('disables the next-step CTA when canProceed is false', () => {
    render(
      <ItemSelector
        {...baseProps({ flow: 'items-first', onNext: vi.fn(), canProceed: false })}
      />,
    );
    expect(screen.getByRole('button', { name: /ver caixas compatíveis/i })).toBeDisabled();
  });

  it('shows the pending occupancy note before a box is selected', () => {
    render(<ItemSelector {...baseProps({ selectedItems: [ITEM_A] })} />);
    expect(
      screen.getByText(/estimativa de ocupação — calculada após a escolha da caixa/i),
    ).toBeInTheDocument();
  });
});
