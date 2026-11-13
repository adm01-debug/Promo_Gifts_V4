import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { FavoritePresentationLauncher } from '@/components/favorites/FavoritePresentationLauncher';
import type { PresentationSlide } from '@/components/presentation/PresentationMode';
import type { Product as CatalogProduct } from '@/types/product-catalog';
import type { Product as DatabaseProduct } from '@/types/product';

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

type Input = ComponentProps<typeof FavoritePresentationLauncher>['products'];
// Compile-time boundary: both complete upstream models remain accepted without casts.
function acceptsBothContracts(catalog: CatalogProduct, database: DatabaseProduct): Input {
  return [catalog, database];
}
void acceptsBothContracts;

describe('FavoritePresentationLauncher minimal shared product contract', () => {
  it('preserves every consumed field and the existing close callback', () => {
    const close = vi.fn();
    const products = [
      {
        id: 'p1',
        name: 'Produto',
        sku: 'SKU-1',
        category_name: 'Categoria',
        brand: 'Marca',
        images: ['image.jpg'],
        description: 'Descrição',
      },
    ];
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
            id: 'old',
            name: 'Legado',
            sku: null,
            images: null,
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
