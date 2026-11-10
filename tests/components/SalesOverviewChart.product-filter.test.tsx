import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SalesOverviewChart } from '@/components/intelligence/SalesOverviewChart';

const sales = vi.hoisted(() => vi.fn(() => ({ data: null, isLoading: false })));
vi.mock('@/hooks/intelligence', () => ({ useSalesHistoryMacro: sales }));

describe('SalesOverviewChart forwards actual product scope to the paginated data hook', () => {
  it.each([undefined, null, '', '  ', 'product-a', ' product-b '] as const)(
    'preserves global and product behavior for %s',
    (productId) => {
      sales.mockClear();
      render(<SalesOverviewChart days={90} productId={productId} />);
      expect(sales).toHaveBeenLastCalledWith(90, productId ?? undefined);
      expect(screen.getByText(/Nenhum dado de vendas disponível/)).toBeInTheDocument();
    },
  );
  it('preserves the original default days and global query without a product prop', () => {
    sales.mockClear();
    render(<SalesOverviewChart />);
    expect(sales).toHaveBeenLastCalledWith(30, undefined);
  });
});
