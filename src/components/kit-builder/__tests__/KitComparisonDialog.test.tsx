import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { KitComparisonDialog } from '../KitComparisonDialog';

const baseKit = {
  id: 'kit-1',
  name: 'Kit A',
  kit_type: 'montado',
  status: 'ready',
  box_data: { name: 'Caixa G', weight: 500 },
  items_data: [
    { name: 'Caneta', sku: 'SKU-1', quantity: 2, weight: 20 },
    { name: 'Caderno', sku: 'SKU-2', quantity: 1, weight: 300 },
  ],
  kit_quantity: 1,
  box_price: 10,
  items_price: 20,
  personalization_price: 0,
  total_price: 30,
  volume_usage_percent: 72,
};

function renderWith(kits: Array<Partial<typeof baseKit>>) {
  return render(
    <KitComparisonDialog
      open
      onOpenChange={() => undefined}
      kits={kits.map((k) => ({ ...baseKit, ...k }))}
    />,
  );
}

describe('KitComparisonDialog', () => {
  it('mostra a linha Volumes com caixas e peso bruto por kit', () => {
    renderWith([
      { id: 'kit-1', name: 'Kit A', freight: { boxesByCode: { G: 2, P: 1 }, grossWeightG: 840 } },
      { id: 'kit-2', name: 'Kit B', freight: { boxesByCode: { G: 3 }, grossWeightG: 1250 } },
    ]);

    expect(screen.getByText('Volumes')).toBeInTheDocument();
    expect(screen.getByText('2× G + 1× P · 840g')).toBeInTheDocument();
    expect(screen.getByText('3× G · 1.3kg')).toBeInTheDocument();
  });

  it('mostra travessão quando o kit não tem plano de volumes', () => {
    renderWith([
      { id: 'kit-1', name: 'Kit A' },
      { id: 'kit-2', name: 'Kit B' },
    ]);

    const cells = screen.getAllByText('—');
    expect(cells.length).toBeGreaterThanOrEqual(2);
  });
});
