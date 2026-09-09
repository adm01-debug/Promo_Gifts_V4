import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductsStep } from '../steps/ProductsStep';
import { MagazineClientPicker } from '../MagazineClientPicker';
import { BrandColorPicker } from '../BrandColorPicker';
import { buildMockMagazine } from '../../templates-gallery/mockMagazine';
import type { Product } from '@/types/product-catalog';

const fixtures = vi.hoisted(() => ({
  products: [] as Product[],
  isError: false,
  refetch: vi.fn(),
  lastFilters: undefined as Record<string, unknown> | undefined,
  lastOptions: undefined as Record<string, unknown> | undefined,
}));
vi.mock('@/hooks/products/useProducts', () => ({
  useProducts: (filters: { search: string }, options: Record<string, unknown>) => {
    fixtures.lastFilters = filters;
    fixtures.lastOptions = options;
    return {
      data: fixtures.products.filter((p) =>
        p.name.toLowerCase().includes(filters.search.toLowerCase()),
      ),
      isLoading: false,
      isError: fixtures.isError,
      refetch: fixtures.refetch,
    };
  },
}));
vi.mock('@/lib/crm-db', () => ({
  selectCrm: () =>
    Promise.resolve([
      { id: 'a', razao_social: 'Alfa', cnpj: '12345678000100' },
      { id: 'b', razao_social: 'Beta', cnpj: '98765432000100' },
    ]),
}));

function productEditor(onAdd = vi.fn().mockResolvedValue(undefined)) {
  const magazine = buildMockMagazine('editorial-vogue');
  fixtures.products = magazine.items.map((item) => item.productSnapshot as unknown as Product);
  const props = {
    magazine: { ...magazine, items: [] },
    onAdd,
    onRemove: vi.fn(),
    onUpdateItem: vi.fn(),
  };
  render(<ProductsStep {...props} />);
  return { onAdd };
}

describe('Magazine — controles reais, dados isolados', () => {
  afterEach(() => {
    fixtures.isError = false;
  });

  it('carrega o conjunto paginado integral e oferece retry inline em erro', () => {
    fixtures.isError = true;
    fixtures.refetch.mockClear();
    productEditor();

    expect(fixtures.lastFilters).not.toHaveProperty('limit');
    expect(fixtures.lastOptions).toMatchObject({ throwOnError: false });
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(fixtures.refetch).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar o catálogo');
  });

  it('adiciona todos os selecionados mesmo após mudar a busca', async () => {
    const { onAdd } = productEditor();
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar Garrafa Térmica Eco' }));
    fireEvent.change(screen.getByTestId('magazine-product-search'), {
      target: { value: 'Mochila' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar Mochila Executiva Slim' }));
    fireEvent.click(screen.getByTestId('magazine-product-add-btn'));
    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1));
    expect(onAdd.mock.calls[0][0].map((p: Product) => p.id)).toEqual(['mock-1', 'mock-2']);
    await waitFor(() => expect(screen.getByTestId('magazine-product-add-btn')).toBeDisabled());
  });

  it('preserva seleção após rejeição e não faz inclusão duplicada em voo', async () => {
    const onAdd = vi.fn().mockRejectedValueOnce(new Error('offline'));
    productEditor(onAdd);
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar Garrafa Térmica Eco' }));
    const button = screen.getByTestId('magazine-product-add-btn');
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(button).toBeEnabled());
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(button).toHaveTextContent('Adicionar (1)');
  });

  it('busca textual inexistente não casa com CNPJ vazio; seleção inclui ID', async () => {
    const onChange = vi.fn();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MagazineClientPicker clientName={null} clientLogoUrl={null} onChange={onChange} />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByTestId('magazine-client-picker-trigger'));
    const input = screen.getByRole('textbox', { name: 'Buscar cliente' });
    fireEvent.change(input, { target: { value: 'ZZZInexistente' } });
    await waitFor(() => expect(screen.getByText('Nenhum cliente encontrado.')).toBeVisible());
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    fireEvent.change(input, { target: { value: 'Beta' } });
    await waitFor(() => expect(screen.getByRole('option', { name: /Beta/ })).toBeVisible());
    fireEvent.click(screen.getByRole('option', { name: /Beta/ }));
    expect(onChange).toHaveBeenCalledWith({
      clientCrmId: 'b',
      clientName: 'Beta',
      clientLogoUrl: null,
    });
    queryClient.clear();
  });

  it('hex acompanha valor externo e blur não restaura a cor anterior', () => {
    const onChange = vi.fn();
    const colors = { primary: '#112233', secondary: '#445566', text: '#111111' };
    const view = render(<BrandColorPicker colors={colors} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Escolher cor Primária' }));
    const input = screen.getByRole('textbox', { name: 'Hex da cor Primária' });
    view.rerender(
      <BrandColorPicker colors={{ ...colors, primary: '#abcdef' }} onChange={onChange} />,
    );
    expect(input).toHaveValue('#abcdef');
    fireEvent.blur(input);
    expect(onChange.mock.calls.at(-1)?.[0].primary.toLowerCase()).toBe('#abcdef');
  });
});
