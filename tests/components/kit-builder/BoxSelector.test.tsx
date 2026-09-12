import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BoxSelector } from '@/components/kit-builder/BoxSelector';
import type { BoxFilters, KitBox, KitItem } from '@/lib/kit-builder';

const filters: BoxFilters = {};
const box = (overrides: Partial<KitBox> = {}): KitBox => ({
  id: 'box-1',
  name: 'Caixa Premium',
  sku: 'CX-001',
  imageUrl: null,
  price: 20,
  internalWidth: 20,
  internalHeight: 20,
  internalDepth: 20,
  internalVolume: 8_000,
  ...overrides,
});
const item = (overrides: Partial<KitItem> = {}): KitItem => ({
  id: 'item-1',
  name: 'Caderno Executivo',
  sku: 'CE-001',
  imageUrl: null,
  price: 30,
  width: 10,
  height: 5,
  depth: 2,
  volume: 100,
  quantity: 1,
  ...overrides,
});

function renderSelector(boxes: KitBox[], kitItems: KitItem[] = []) {
  const onSelect = vi.fn();
  render(
    <BoxSelector
      boxes={boxes}
      selectedBox={null}
      kitItems={kitItems}
      isLoading={false}
      filters={filters}
      onFiltersChange={vi.fn()}
      onSelect={onSelect}
      onClear={vi.fn()}
    />,
  );
  return onSelect;
}

describe('BoxSelector', () => {
  it('shows a compatibility explanation and selects a verified compatible box through an explicit action', () => {
    const compatible = box();
    const onSelect = renderSelector([compatible], [item()]);

    expect(screen.getByText('Melhor ajuste estimado')).toBeInTheDocument();
    expect(screen.getByLabelText(/ocupação estimada/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /selecionar caixa caixa premium/i }));
    expect(onSelect).toHaveBeenCalledWith(compatible);
  });

  it('does not allow an incompatible box to be selected', () => {
    const incompatible = box({ internalWidth: 5 });
    const onSelect = renderSelector([incompatible], [item({ width: 50, height: 50, depth: 50 })]);

    expect(screen.getByText('Não compatível')).toBeInTheDocument();
    const action = screen.getByRole('button', { name: /selecionar caixa caixa premium/i });
    expect(action).toBeDisabled();
    fireEvent.click(action);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
