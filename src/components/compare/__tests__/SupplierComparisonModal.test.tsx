import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SupplierComparisonModal } from '../SupplierComparisonModal';

const makeProduct = (id: string, supplier: string, price: number) => ({
  id,
  name: `Caneta ${id}`,
  price,
  stock: 100,
  minQuantity: 1,
  leadTimeDays: 5,
  is_active: true,
  images: [],
  supplier: { id: `sup-${id}`, name: supplier },
});

const base = makeProduct('p-base', 'Fornecedor Base', 10);
const alt = makeProduct('p-alt', 'Fornecedor Alternativo', 8);

vi.mock('@/hooks/products', () => ({
  useSupplierComparison: () => ({
    isLoading: false,
    result: {
      baseProduct: base,
      alternatives: [
        {
          product: alt,
          priceDiff: -2,
          priceDiffPercent: -20,
          stockAdvantage: false,
          isLowestPrice: true,
          isBestStock: true,
          commonColors: [],
          leadTimeDays: 5,
          isVerified: true,
          score: 90,
          scoreBreakdown: { price: 35, stock: 20, colors: 10, moq: 15, lead: 5, verified: 5 },
          economiaPorMOQ: 2,
          effectiveMOQ: 1,
        },
      ],
      lowestPrice: 8,
      highestStock: 100,
      maxEconomiaPorMOQ: 2,
      fastestLeadTimeDays: 5,
    },
  }),
}));

vi.mock('../PriceSparkline', () => ({ PriceSparkline: () => null }));

describe('SupplierComparisonModal — botões de escolha', () => {
  const onSelectSupplier = vi.fn();
  const onOpenChange = vi.fn();

  beforeEach(() => {
    onSelectSupplier.mockClear();
    onOpenChange.mockClear();
  });

  const renderModal = () =>
    render(
      <SupplierComparisonModal
        product={null}
        open
        onOpenChange={onOpenChange}
        onSelectSupplier={onSelectSupplier}
      />,
    );

  it('"Trocar" seleciona a alternativa e "Confirmar Escolha" dispara onSelectSupplier', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: 'Trocar' }));
    expect(screen.getByRole('button', { name: 'Selecionado' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Confirmar Escolha/ }));
    expect(onSelectSupplier).toHaveBeenCalledWith('p-alt');
  });

  it('"Selecionar Fornecedor" (cards) também leva à troca', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('tab', { name: /Cards/ }));
    await user.click(screen.getByRole('button', { name: 'Selecionar Fornecedor' }));
    await user.click(screen.getByRole('button', { name: /Confirmar Escolha/ }));
    expect(onSelectSupplier).toHaveBeenCalledWith('p-alt');
  });

  it('confirmar sem trocar mantém o produto atual e fecha o modal', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: /Confirmar Escolha/ }));
    expect(onSelectSupplier).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
