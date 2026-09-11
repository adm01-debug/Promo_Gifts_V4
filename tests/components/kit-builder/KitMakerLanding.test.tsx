import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { dbInvoke } from '@/lib/db/postgrest';
import { KitMakerLanding } from '@/components/kit-builder/KitMakerLanding';

vi.mock('@/lib/db/postgrest', () => ({ dbInvoke: vi.fn() }));

vi.mock('@/components/kit-builder/KitAIPromptDialog', () => ({
  KitAIPromptDialog: () => <button type="button">Montar com IA</button>,
}));

vi.mock('@/components/kit-builder/KitOccasionSelector', () => ({
  KitOccasionSelector: () => <div data-testid="occasion-selector" />,
}));

const FEATURED_PRODUCTS = [
  {
    id: 'product-1',
    name: 'Garrafa Térmica Eco',
    sku: 'GT-001',
    sale_price: 49.9,
    primary_image_url: 'https://cdn.example.test/garrafa.jpg',
    images: [],
    product_type: 'product',
  },
  {
    id: 'product-2',
    name: 'Caderno Executivo',
    sku: 'CE-001',
    sale_price: 27.4,
    primary_image_url: 'https://cdn.example.test/caderno.jpg',
    images: [],
    product_type: 'product',
  },
  {
    id: 'packaging-1',
    name: 'Caixa que não deve aparecer como produto',
    sku: 'CX-001',
    sale_price: 18.9,
    primary_image_url: 'https://cdn.example.test/caixa.jpg',
    images: [],
    product_type: 'packaging',
  },
];

function renderLanding(overrides: Partial<ComponentProps<typeof KitMakerLanding>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const props: ComponentProps<typeof KitMakerLanding> = {
    occasion: null,
    onOccasionChange: vi.fn(),
    onApplyAISuggestion: vi.fn(),
    onStart: vi.fn(),
    ...overrides,
  };

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <KitMakerLanding {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return props;
}

describe('KitMakerLanding', () => {
  it('renders the two intentional journeys, visual benefits, and real featured catalog media', async () => {
    vi.mocked(dbInvoke).mockResolvedValueOnce({ records: FEATURED_PRODUCTS, count: 3 });
    renderLanding();

    expect(screen.getByRole('heading', { name: 'Kit Maker', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Começar pelos itens', level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Começar pela caixa', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('Validação inteligente')).toBeInTheDocument();
    expect(screen.getByText('Caixas recomendadas')).toBeInTheDocument();
    expect(screen.getByText('Personalização completa')).toBeInTheDocument();
    expect(screen.getByText('Orçamento em tempo real')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByAltText('Garrafa Térmica Eco')).toBeInTheDocument());
    expect(screen.getByAltText('Produtos em destaque para montar um kit')).toHaveAttribute(
      'src',
      'https://cdn.example.test/garrafa.jpg',
    );
    expect(screen.queryByText('Caixa que não deve aparecer como produto')).not.toBeInTheDocument();
    expect(dbInvoke).toHaveBeenCalledWith(
      expect.objectContaining({
        table: 'products',
        filters: { active: true, is_featured: true },
        select: expect.stringContaining('product_type'),
      }),
    );
  });

  it('starts each flow explicitly instead of relying on a decorative card', async () => {
    vi.mocked(dbInvoke).mockResolvedValueOnce({ records: [], count: 0 });
    const onStart = vi.fn();
    renderLanding({ onStart });

    fireEvent.click(screen.getByRole('button', { name: /começar pelos itens/i }));
    fireEvent.click(screen.getByRole('button', { name: /começar pela caixa/i }));

    expect(onStart).toHaveBeenNthCalledWith(1, 'items-first');
    expect(onStart).toHaveBeenNthCalledWith(2, 'box-first');
  });

  it('has a truthful empty-state when the catalog has no highlighted product', async () => {
    vi.mocked(dbInvoke).mockResolvedValueOnce({ records: [], count: 0 });
    renderLanding();

    expect(await screen.findByText('Os destaques ainda não foram definidos no catálogo.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /abrir biblioteca/i })).toHaveAttribute('href', '/meus-kits');
  });
});
