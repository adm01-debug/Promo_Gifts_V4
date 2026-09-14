import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ItemSelector } from '@/components/kit-builder/ItemSelector';
import type { KitItem } from '@/lib/kit-builder';

vi.mock('@/components/kit-builder/KitSmartSuggestions', () => ({
  KitSmartSuggestions: () => null,
}));

const ITEM: KitItem & { compatibility: null } = {
  id: 'p1',
  name: 'Caderno',
  sku: 'CAD',
  imageUrl: null,
  price: 25,
  quantity: 1,
  category: 'Escritório',
  material: 'Papel',
  width: 1,
  height: 1,
  depth: 1,
  volume: 1,
  compatibility: null,
};

describe('ItemSelector filters', () => {
  it('keeps material, price, and sorting controls visible with a single category', () => {
    render(
      <ItemSelector
        items={[ITEM]}
        selectedItems={[]}
        isLoading={false}
        filters={{}}
        onFiltersChange={vi.fn()}
        onAddItem={() => ({ fits: true })}
        onRemoveItem={vi.fn()}
        onUpdateQuantity={vi.fn()}
        onUpdateVariant={vi.fn()}
        boxSelected={false}
      />,
    );

    expect(screen.getByRole('combobox', { name: /material/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /ordenar/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Preço mínimo')).toBeInTheDocument();
    expect(screen.getByLabelText('Preço máximo')).toBeInTheDocument();
  });
});
