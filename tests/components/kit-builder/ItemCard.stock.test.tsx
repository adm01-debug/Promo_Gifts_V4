/**
 * tests/components/kit-builder/ItemCard.stock.test.tsx
 *
 * Etapa 14 do plano de finalização (docs/plans/KIT_MAKER_PLANO_FINALIZACAO_20_ETAPAS_2026-09-23.md).
 * Cobre os 4 estados do estoque no card do item: carregando (undefined),
 * desconhecido (null), sem estoque (0) e em estoque (N) — nunca confundidos.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StockBadge, ItemCard } from '@/components/kit-builder/ItemCard';
import type { KitItem, CompatibilityResult } from '@/lib/kit-builder';

describe('StockBadge — 4 estados', () => {
  it('carregando (stock undefined): mostra "Verificando estoque"', () => {
    render(<StockBadge stock={undefined} />);
    expect(screen.getByText('Verificando estoque')).toBeInTheDocument();
  });

  it('desconhecido (stock null): mostra "Estoque desconhecido", nunca "Sem estoque"', () => {
    render(<StockBadge stock={null} />);
    expect(screen.getByText('Estoque desconhecido')).toBeInTheDocument();
    expect(screen.queryByText('Sem estoque')).not.toBeInTheDocument();
  });

  it('sem estoque (stock 0): mostra "Sem estoque", nunca "Estoque desconhecido"', () => {
    render(<StockBadge stock={0} />);
    expect(screen.getByText('Sem estoque')).toBeInTheDocument();
    expect(screen.queryByText('Estoque desconhecido')).not.toBeInTheDocument();
  });

  it('em estoque (stock 42): mostra a quantidade exata', () => {
    render(<StockBadge stock={42} />);
    expect(screen.getByText('Em estoque (42)')).toBeInTheDocument();
  });
});

describe('ItemCard — repassa item.stock para o StockBadge', () => {
  const BASE_ITEM: KitItem & { compatibility: CompatibilityResult | null } = {
    id: 'p1',
    name: 'Caderno',
    sku: 'CAD',
    imageUrl: null,
    price: 25,
    quantity: 1,
    width: 1,
    height: 1,
    depth: 1,
    volume: 1,
    compatibility: null,
  };

  it('view grid: nunca lê estoque nulo como zero', () => {
    render(
      <ItemCard
        item={{ ...BASE_ITEM, stock: null }}
        isSelected={false}
        boxSelected={false}
        onAdd={() => {}}
        onRemove={() => {}}
        view="grid"
      />,
    );
    expect(screen.getByText('Estoque desconhecido')).toBeInTheDocument();
  });

  it('view list: mostra a quantidade quando o estoque é conhecido', () => {
    render(
      <ItemCard
        item={{ ...BASE_ITEM, stock: 5 }}
        isSelected={false}
        boxSelected={false}
        onAdd={() => {}}
        onRemove={() => {}}
        view="list"
      />,
    );
    expect(screen.getByText('Em estoque (5)')).toBeInTheDocument();
  });

  it('view grid: estoque undefined (consulta em voo) mostra "Verificando estoque"', () => {
    render(
      <ItemCard
        item={{ ...BASE_ITEM, stock: undefined }}
        isSelected={false}
        boxSelected={false}
        onAdd={() => {}}
        onRemove={() => {}}
        view="grid"
      />,
    );
    expect(screen.getByText('Verificando estoque')).toBeInTheDocument();
  });

  it('view list: estoque 0 mostra "Sem estoque", nunca confundido com desconhecido ou carregando', () => {
    render(
      <ItemCard
        item={{ ...BASE_ITEM, stock: 0 }}
        isSelected={false}
        boxSelected={false}
        onAdd={() => {}}
        onRemove={() => {}}
        view="list"
      />,
    );
    expect(screen.getByText('Sem estoque')).toBeInTheDocument();
    expect(screen.queryByText('Estoque desconhecido')).not.toBeInTheDocument();
    expect(screen.queryByText('Verificando estoque')).not.toBeInTheDocument();
  });
});
