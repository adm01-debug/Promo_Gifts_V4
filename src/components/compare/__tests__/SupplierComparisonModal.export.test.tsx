/**
 * Etapa 091 / ACH-048 + ACH-078 — o botão "Exportar Relatório" não tinha ação
 * e não tinha nome acessível.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SupplierComparisonModal } from '../SupplierComparisonModal';

const exportToExcel = vi.hoisted(() => vi.fn());
const toastSuccess = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());
const toastInfo = vi.hoisted(() => vi.fn());

vi.mock('@/utils/excelExport', () => ({ exportToExcel }));
vi.mock('sonner', () => ({
  toast: { success: toastSuccess, error: toastError, info: toastInfo },
}));
vi.mock('../PriceSparkline', () => ({ PriceSparkline: () => null }));

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

describe('SupplierComparisonModal — exportar relatório', () => {
  beforeEach(() => {
    exportToExcel.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    toastInfo.mockReset();
  });

  const renderModal = () =>
    render(
      <SupplierComparisonModal
        product={base as never}
        open
        onOpenChange={vi.fn()}
        onSelectSupplier={vi.fn()}
      />,
    );

  it('expõe o botão com nome acessível', () => {
    renderModal();
    expect(
      screen.getByRole('button', { name: /Exportar relatório comparativo em Excel/i }),
    ).toBeInTheDocument();
  });

  it('exporta os fornecedores filtrados quando clicado', async () => {
    exportToExcel.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderModal();

    await user.click(
      screen.getByRole('button', { name: /Exportar relatório comparativo em Excel/i }),
    );

    expect(exportToExcel).toHaveBeenCalledTimes(1);
    const config = exportToExcel.mock.calls[0][0];
    expect(config.filename).toContain('comparativo-');
    expect(config.data).toHaveLength(2);
    expect(config.data.map((r: { supplier: string }) => r.supplier)).toEqual([
      'Fornecedor Base',
      'Fornecedor Alternativo',
    ]);
    expect(toastSuccess).toHaveBeenCalled();
  });

  it('avisa o usuário quando a exportação falha', async () => {
    exportToExcel.mockRejectedValue(new Error('boom'));
    const user = userEvent.setup();
    renderModal();

    await user.click(
      screen.getByRole('button', { name: /Exportar relatório comparativo em Excel/i }),
    );

    expect(toastError).toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});
