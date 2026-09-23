import { fireEvent, render, screen } from '../../test-utils';
import { describe, expect, it, beforeEach } from 'vitest';
import { useFavoritesStore } from '@/stores/useFavoritesStore';
import { FavoriteToggleButton } from '@/components/kit-builder/FavoriteToggleButton';
import { ItemCard } from '@/components/kit-builder/ItemCard';
import { BoxSelector } from '@/components/kit-builder/BoxSelector';
import type { BoxFilters, KitBox, KitItem } from '@/lib/kit-builder';

describe('FavoriteToggleButton', () => {
  beforeEach(() => {
    localStorage.clear();
    useFavoritesStore.setState({ favorites: [], favoriteIds: new Set(), favoriteCount: 0, isLoaded: true });
  });

  it('toggles a product in and out of the shared favorites store', () => {
    render(<FavoriteToggleButton productId="prod-1" productName="Caneta" />);

    const button = screen.getByRole('button', { name: 'Favoritar Caneta' });
    expect(useFavoritesStore.getState().isFavorite('prod-1')).toBe(false);

    fireEvent.click(button);
    expect(useFavoritesStore.getState().isFavorite('prod-1')).toBe(true);
    expect(screen.getByRole('button', { name: 'Remover Caneta dos favoritos' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remover Caneta dos favoritos' }));
    expect(useFavoritesStore.getState().isFavorite('prod-1')).toBe(false);
  });

  it('reflects the toggle immediately for a consumer subscribed to the same store (e.g. /favoritos)', () => {
    render(<FavoriteToggleButton productId="prod-2" productName="Bloco" />);
    fireEvent.click(screen.getByRole('button', { name: 'Favoritar Bloco' }));

    expect(useFavoritesStore.getState().favorites.map((f) => f.productId)).toContain('prod-2');
  });
});

describe('ItemCard favorite toggle', () => {
  beforeEach(() => {
    localStorage.clear();
    useFavoritesStore.setState({ favorites: [], favoriteIds: new Set(), favoriteCount: 0, isLoaded: true });
  });

  const item: KitItem & { compatibility: null } = {
    id: 'item-1',
    name: 'Caderno Executivo',
    sku: 'CE-001',
    imageUrl: null,
    price: 30,
    quantity: 1,
    width: 10,
    height: 5,
    depth: 2,
    volume: 100,
    compatibility: null,
  };

  it('renders a favorite toggle that updates the shared store', () => {
    render(
      <ItemCard
        item={item}
        isSelected={false}
        boxSelected={false}
        onAdd={() => undefined}
        onRemove={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /favoritar caderno executivo/i }));
    expect(useFavoritesStore.getState().isFavorite('item-1')).toBe(true);
  });
});

describe('BoxSelector favorite toggle', () => {
  beforeEach(() => {
    localStorage.clear();
    useFavoritesStore.setState({ favorites: [], favoriteIds: new Set(), favoriteCount: 0, isLoaded: true });
  });

  const filters: BoxFilters = {};
  const box: KitBox = {
    id: 'box-1',
    name: 'Caixa Premium',
    sku: 'CX-001',
    imageUrl: null,
    price: 20,
    internalWidth: 20,
    internalHeight: 20,
    internalDepth: 20,
    internalVolume: 8_000,
  };

  it('renders a favorite toggle on the box card that updates the shared store', () => {
    render(
      <BoxSelector
        boxes={[box]}
        selectedBox={null}
        isLoading={false}
        filters={filters}
        onFiltersChange={() => undefined}
        onSelect={() => undefined}
        onClear={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /favoritar caixa premium/i }));
    expect(useFavoritesStore.getState().isFavorite('box-1')).toBe(true);
  });
});
