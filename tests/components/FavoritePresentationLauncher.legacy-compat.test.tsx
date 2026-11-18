/**
 * Resgate de teste órfão — cobertura do FavoritePresentationLauncher.
 *
 * Branch de origem: origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252
 *   (a outra fonte candidata, origin/salvo/claude-fix-pr3517-gate1-baseline-261113-2336,
 *    não contém este arquivo)
 * Caminho original: tests/components/FavoritePresentationLauncher.legacy-compat.test.tsx
 * Componente coberto: src/components/favorites/FavoritePresentationLauncher.tsx
 *   (resgatado na PR #3812; os 3 casos `it` da fonte foram preservados)
 *
 * DRIFT ADAPTADO (medido na main, commit 965097039):
 * 1. A fonte assumia um "minimal shared product contract" estrutural no
 *    componente. A main declara `products: Product[]` com `Product` de
 *    `@/types/product-catalog` (FavoritePresentationLauncher.tsx:12 e :15),
 *    que é um modelo completo e obrigatório. Por isso os literais parciais da
 *    fonte (só id/name/sku/category_name/brand/images/description) foram
 *    trocados por fixtures COMPLETAS tipadas `satisfies Product` — sem cast,
 *    mantendo a garantia de compilação sobre o contrato real. As asserções de
 *    comportamento (`captured.slides`, heading, subtitle, onClose) seguem
 *    idênticas às da fonte.
 * 2. REMOVIDO o helper de compile-time `acceptsBothContracts(catalog, database)`,
 *    que exigia que o componente aceitasse também `Product` de `@/types/product`
 *    sem cast. Esse contrato duplo não existe mais: a prop é
 *    `Product[]` de product-catalog (FavoritePresentationLauncher.tsx:15) e os
 *    dois modelos são incompatíveis por tipo. Medido com tsc em um arquivo de
 *    sonda isolado (`return [catalog, database]` tipado como CatalogProduct[]):
 *    "error TS2739: Type 'Product' is missing the following properties from
 *    type 'Product': minQuantity, stockStatus, newArrival, onSale, isKit" —
 *    campos obrigatórios em src/types/product-catalog.ts:62,90,92-94 e ausentes
 *    em src/types/product.ts:4-58.
 *    Não é um caso `it`, é uma fronteira de tipo; nenhum dos 3 casos de teste
 *    foi omitido.
 * 3. No caso de campos legados nulos, `sku: null` virou `sku: ''` e
 *    `images: null` virou `images: []` pelo mesmo motivo do item 2
 *    (product-catalog.ts:52-53 declara ambos não-nulos). As asserções
 *    resultantes são as mesmas da fonte: `imageUrl: null` e nenhum detalhe
 *    "SKU". `category_name: null` e `description: null` continuam nuláveis e
 *    seguem exercitados como na fonte.
 *
 * Defeito de produção: nenhum encontrado — os 3 casos passam contra a main
 * sem tocar em src/.
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FavoritePresentationLauncher } from '@/components/favorites/FavoritePresentationLauncher';
import type { PresentationSlide } from '@/components/presentation/PresentationMode';
import type { Product } from '@/types/product-catalog';

const captured = vi.hoisted(() => ({ slides: [] as PresentationSlide[] }));
vi.mock('@/components/presentation/PresentationMode', () => ({
  PresentationMode: ({
    slides,
    title,
    subtitle,
    onClose,
  }: {
    slides: PresentationSlide[];
    title: string;
    subtitle?: string;
    onClose: () => void;
  }) => {
    captured.slides = slides;
    return (
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <button onClick={onClose}>Fechar apresentação</button>
      </div>
    );
  },
}));

/**
 * Fixture completa do contrato atual (`Product` de product-catalog), sem cast:
 * os campos não consumidos pelo launcher existem só para satisfazer o modelo.
 */
const baseProduct = {
  id: 'p1',
  name: 'Produto',
  sku: 'SKU-1',
  category_name: 'Categoria',
  brand: 'Marca',
  images: ['image.jpg'],
  description: 'Descrição',
  shortDescription: '',
  price: 10,
  stock: 1,
  colors: [],
  materials: [],
  minQuantity: 1,
  stockStatus: 'in-stock',
  featured: false,
  newArrival: false,
  onSale: false,
  isKit: false,
  category: { id: 1, name: 'Categoria' },
  supplier: { id: 's1', name: 'Fornecedor' },
  tags: {
    publicoAlvo: [],
    datasComemorativas: [],
    endomarketing: [],
    ramo: [],
    nicho: [],
  },
} satisfies Product;

describe('FavoritePresentationLauncher minimal shared product contract', () => {
  it('preserves every consumed field and the existing close callback', () => {
    const close = vi.fn();
    const products: Product[] = [baseProduct];
    render(
      <FavoritePresentationLauncher
        products={products}
        listName="Minha lista"
        curatorName="Ana"
        onClose={close}
      />,
    );
    expect(screen.getByRole('heading')).toHaveTextContent('Minha lista');
    expect(screen.getByText('Curadoria de Ana')).toBeInTheDocument();
    expect(captured.slides).toEqual([
      {
        id: 'p1',
        title: 'Produto',
        subtitle: 'Categoria',
        imageUrl: 'image.jpg',
        description: 'Descrição',
        details: [
          { label: 'SKU', value: 'SKU-1' },
          { label: 'Marca', value: 'Marca' },
        ],
      },
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Fechar apresentação' }));
    expect(close).toHaveBeenCalledOnce();
  });

  it('accepts nullable legacy fields and keeps brand as the category fallback', () => {
    render(
      <FavoritePresentationLauncher
        products={[
          {
            ...baseProduct,
            id: 'old',
            name: 'Legado',
            sku: '',
            images: [],
            description: null,
            category_name: null,
            brand: 'Marca antiga',
          },
        ]}
        listName="Legados"
        onClose={() => {}}
      />,
    );
    expect(captured.slides).toEqual([
      {
        id: 'old',
        title: 'Legado',
        subtitle: 'Marca antiga',
        imageUrl: null,
        description: null,
        details: [{ label: 'Marca', value: 'Marca antiga' }],
      },
    ]);
  });

  it('retains the empty-list behavior without inventing placeholder products', () => {
    render(<FavoritePresentationLauncher products={[]} listName="Vazia" onClose={() => {}} />);
    expect(captured.slides).toEqual([]);
  });
});
