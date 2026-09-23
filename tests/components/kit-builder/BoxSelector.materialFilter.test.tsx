import { fireEvent, render, screen } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import { BoxSelector } from '@/components/kit-builder/BoxSelector';
import type { BoxFilters, KitBox } from '@/lib/kit-builder';

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

function openAdvancedFilters() {
  fireEvent.click(screen.getByRole('button', { name: 'SlidersHorizontal' }));
}

describe('BoxSelector — filtro de material (multi-seleção com contagem)', () => {
  it('mostra a contagem de caixas por material respeitando os outros filtros ativos', () => {
    const paperBox = box({ id: 'box-paper', name: 'Caixa Papel', material: 'Papel Kraft' });
    // `boxes` simula o resultado já filtrado por outros critérios (ex: preço) —
    // a caixa plástica foi excluída por eles, não pelo filtro de material.
    const boxes = [paperBox];
    const allBoxes = [paperBox, box({ id: 'box-plastic', name: 'Caixa Plástico', material: 'Plástico' })];

    render(
      <BoxSelector
        boxes={boxes}
        allBoxes={allBoxes}
        selectedBox={null}
        isLoading={false}
        filters={{}}
        onFiltersChange={vi.fn()}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    openAdvancedFilters();

    expect(screen.getByLabelText(/Papel Kraft/)).toBeInTheDocument();
    expect(screen.getByText('(1)', { exact: false })).toBeInTheDocument();

    // Plástico não tem nenhuma caixa no conjunto filtrado por outros critérios
    // (0), mas continua visível — só desabilitado.
    const plasticCheckbox = screen.getByRole('checkbox', { name: /Plástico/ });
    expect(plasticCheckbox).toBeDisabled();
  });

  it('aplica multi-seleção: marcar um segundo material soma à seleção existente', () => {
    const onFiltersChange = vi.fn();
    const boxes = [
      box({ id: 'box-paper', name: 'Caixa Papel', material: 'Papel Kraft' }),
      box({ id: 'box-plastic', name: 'Caixa Plástico', material: 'Plástico' }),
    ];
    const filters: BoxFilters = { material: ['Papel Kraft'] };

    render(
      <BoxSelector
        boxes={boxes}
        allBoxes={boxes}
        selectedBox={null}
        isLoading={false}
        filters={filters}
        onFiltersChange={onFiltersChange}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    openAdvancedFilters();

    const plasticCheckbox = screen.getByRole('checkbox', { name: /Plástico/ });
    expect(plasticCheckbox).not.toBeDisabled();
    fireEvent.click(plasticCheckbox);

    expect(onFiltersChange).toHaveBeenCalledWith({
      material: ['Papel Kraft', 'Plástico'],
    });
  });

  it('desmarcar o único material selecionado limpa o filtro (undefined, não array vazio)', () => {
    const onFiltersChange = vi.fn();
    const boxes = [box({ id: 'box-paper', name: 'Caixa Papel', material: 'Papel Kraft' })];
    const filters: BoxFilters = { material: ['Papel Kraft'] };

    render(
      <BoxSelector
        boxes={boxes}
        allBoxes={boxes}
        selectedBox={null}
        isLoading={false}
        filters={filters}
        onFiltersChange={onFiltersChange}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    openAdvancedFilters();
    fireEvent.click(screen.getByRole('checkbox', { name: /Papel Kraft/ }));

    expect(onFiltersChange).toHaveBeenCalledWith({ material: undefined });
  });

  it('só exibe caixas cujo material esteja entre os selecionados', () => {
    const boxes = [
      box({ id: 'box-paper', name: 'Caixa Papel', material: 'Papel Kraft' }),
      box({ id: 'box-plastic', name: 'Caixa Plástico', material: 'Plástico' }),
    ];
    const filters: BoxFilters = { material: ['Plástico'] };

    render(
      <BoxSelector
        boxes={boxes}
        allBoxes={boxes}
        selectedBox={null}
        isLoading={false}
        filters={filters}
        onFiltersChange={vi.fn()}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(screen.getAllByText('Caixa Plástico').length).toBeGreaterThan(0);
    expect(screen.queryByText('Caixa Papel')).not.toBeInTheDocument();
  });
});
