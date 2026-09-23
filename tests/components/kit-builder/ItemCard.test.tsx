import { render, screen } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import { ItemCard } from '@/components/kit-builder/ItemCard';
import type { KitItem } from '@/lib/kit-builder';

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

describe('ItemCard — estoque (etapa 14)', () => {
  it('mostra skeleton enquanto o estoque agregado ainda está em voo', () => {
    const { container } = render(
      <ItemCard
        item={ITEM}
        isSelected={false}
        boxSelected={false}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        isLoadingStock
      />,
    );
    expect(screen.queryByText(/estoque/i)).not.toBeInTheDocument();
    expect(container.querySelector('.skeleton-shimmer')).toBeInTheDocument();
  });

  it('mostra "Estoque desconhecido" quando stock é null (nenhuma variante retornada)', () => {
    render(
      <ItemCard
        item={{ ...ITEM, stock: null }}
        isSelected={false}
        boxSelected={false}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByText('Estoque desconhecido')).toBeInTheDocument();
  });

  it('mostra "Sem estoque" quando a soma das variantes é zero — nunca "0"', () => {
    render(
      <ItemCard
        item={{ ...ITEM, stock: 0 }}
        isSelected={false}
        boxSelected={false}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByText('Sem estoque')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('mostra "Em estoque (N)" quando a soma das variantes é positiva', () => {
    render(
      <ItemCard
        item={{ ...ITEM, stock: 42 }}
        isSelected={false}
        boxSelected={false}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByText('Em estoque (42)')).toBeInTheDocument();
  });
});
