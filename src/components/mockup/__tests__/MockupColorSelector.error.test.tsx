/**
 * ProductLoaderAndColorSelector (MockupColorSelector.tsx) — estado de erro.
 *
 * Defeito coberto (A-estados): erro de carga das variantes de cor era tratado
 * como "produto sem variantes" (o `useEffect` de auto-seleção só checava
 * `!variants || variants.length === 0`), então o produto era selecionado SEM COR
 * e o vendedor gerava o mockup com a cor errada sem perceber.
 *
 * Cada caso abaixo falha se o comportamento correspondente for quebrado.
 */
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Product } from '@/types/product-catalog';
import type { ExternalVariantStock } from '@/hooks/products/useExternalVariantStock';

const mockUseProduct = vi.fn();
const mockUseExternalVariantStock = vi.fn();
const refetchProduct = vi.fn();
const refetchVariants = vi.fn();

// Mock aponta para o caminho REAL importado pelo componente (@/hooks/products).
vi.mock('@/hooks/products', () => ({
  useProduct: (...args: unknown[]) => mockUseProduct(...args),
  useExternalVariantStock: (...args: unknown[]) => mockUseExternalVariantStock(...args),
}));

import { ProductLoaderAndColorSelector } from '../MockupColorSelector';

function makeProduct(): Product {
  return {
    id: 'p1',
    name: 'Caneca Premium',
    shortDescription: 'Caneca',
    price: 19.9,
    images: ['https://cdn.example.com/caneca.png'],
    sku: 'CAN-001',
    stock: 10,
    colors: [],
    materials: [],
    minQuantity: 1,
    stockStatus: 'in-stock',
    featured: false,
    newArrival: false,
    onSale: false,
    isKit: false,
    category: { id: 1, name: 'Canecas' },
    supplier: { id: 's1', name: 'Fornecedor' },
    tags: {
      publicoAlvo: [],
      datasComemorativas: [],
      endomarketing: [],
      ramo: [],
      nicho: [],
    },
  };
}

function makeVariant(): ExternalVariantStock {
  return {
    id: 'v1',
    product_id: 'p1',
    sku: 'CAN-001-AZ',
    supplier_sku: null,
    color_code: 'AZ',
    color_name: 'Azul',
    color_hex: '#0055ff',
    size_code: null,
    stock_quantity: 10,
    next_entry_date: null,
    next_entry_quantity: null,
    selected_thumbnail: null,
    images: null,
    bitrix_product_id: null,
  };
}

const okProduct = (data: Product) => ({
  data,
  isLoading: false,
  isError: false,
  refetch: refetchProduct,
});

const failedProduct = () => ({
  data: undefined,
  isLoading: false,
  isError: true,
  refetch: refetchProduct,
});

const okVariants = (data: ExternalVariantStock[]) => ({
  data,
  isLoading: false,
  isError: false,
  refetch: refetchVariants,
});

const failedVariants = () => ({
  data: undefined,
  isLoading: false,
  isError: true,
  refetch: refetchVariants,
});

/** Deixa o `useEffect` de auto-seleção (se disparar) rodar dentro do act. */
async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('ProductLoaderAndColorSelector — erro de carga não é "produto sem cor"', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('erro nas variantes mostra estado de erro com "Tentar novamente" e NÃO seleciona o produto sem cor', async () => {
    const onSelect = vi.fn();
    mockUseProduct.mockReturnValue(okProduct(makeProduct()));
    mockUseExternalVariantStock.mockReturnValue(failedVariants());

    render(<ProductLoaderAndColorSelector productId="p1" onSelect={onSelect} onBack={vi.fn()} />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      /não foi possível carregar a lista de cores deste produto/i,
    );
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();

    await flushEffects();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('clicar em "Tentar novamente" refaz a consulta das variantes', async () => {
    mockUseProduct.mockReturnValue(okProduct(makeProduct()));
    mockUseExternalVariantStock.mockReturnValue(failedVariants());

    render(
      <ProductLoaderAndColorSelector productId="p1" onSelect={vi.fn()} onBack={vi.fn()} />,
    );

    await userEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));

    expect(refetchVariants).toHaveBeenCalledTimes(1);
  });

  it('produto realmente sem variantes continua sendo selecionado sem cor (sem estado de erro)', async () => {
    const onSelect = vi.fn();
    const product = makeProduct();
    mockUseProduct.mockReturnValue(okProduct(product));
    mockUseExternalVariantStock.mockReturnValue(okVariants([]));

    render(<ProductLoaderAndColorSelector productId="p1" onSelect={onSelect} onBack={vi.fn()} />);

    await flushEffects();

    expect(onSelect).toHaveBeenCalledWith(null, product);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('falha ao carregar o produto também vira erro retentável (não "Produto não encontrado")', async () => {
    const onSelect = vi.fn();
    mockUseProduct.mockReturnValue(failedProduct());
    mockUseExternalVariantStock.mockReturnValue(okVariants([makeVariant()]));

    render(<ProductLoaderAndColorSelector productId="p1" onSelect={onSelect} onBack={vi.fn()} />);

    expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível carregar o produto/i);

    await userEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(refetchProduct).toHaveBeenCalledTimes(1);

    await flushEffects();
    expect(onSelect).not.toHaveBeenCalled();
  });
});
