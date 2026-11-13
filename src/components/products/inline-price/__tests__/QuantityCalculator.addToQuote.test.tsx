import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QuantityCalculator } from '../QuantityCalculator';
import { InlinePriceCalculator } from '../../InlinePriceCalculator';
import { dbInvoke, type InvokeOptions } from '@/lib/db/postgrest';

vi.mock('@/lib/db/postgrest', () => ({
  dbInvoke: vi.fn().mockResolvedValue({ records: [] }),
}));

const baseProps = {
  customQuantity: 250,
  onQuantityChange: vi.fn(),
  minQuantity: 50,
  unitPrice: 10,
  total: 2500,
  discount: 0,
  formatPrice: (n: number) => `R$ ${n}`,
};

const addButton = () => screen.getByRole('button', { name: /^Orçar 250 un$/ });

describe('QuantityCalculator — botão "Orçar N un" (PM-05)', () => {
  it.each([
    ['compacto', true],
    ['expandido', false],
  ])(
    'modo %s: clicar chama onAddToQuote com a quantidade e o preço unitário exibido',
    (_label, compact) => {
      const onAddToQuote = vi.fn();
      render(
        <TooltipProvider>
          <QuantityCalculator {...baseProps} compact={compact} onAddToQuote={onAddToQuote} />
        </TooltipProvider>,
      );
      fireEvent.click(addButton());
      expect(onAddToQuote).toHaveBeenCalledTimes(1);
      expect(onAddToQuote).toHaveBeenCalledWith(250, 10);
    },
  );

  it('sem onAddToQuote não renderiza botão inerte', () => {
    render(
      <TooltipProvider>
        <QuantityCalculator {...baseProps} compact />
      </TooltipProvider>,
    );
    expect(screen.queryByRole('button', { name: /ao\s*Orçamento/ })).toBeNull();
  });

  it('InlinePriceCalculator repassa onAddToQuote com a quantidade atual', () => {
    const onAddToQuote = vi.fn();
    render(
      <TooltipProvider>
        <InlinePriceCalculator
          productName="Caneca"
          basePrice={10}
          minQuantity={250}
          defaultOpen
          onAddToQuote={onAddToQuote}
        />
      </TooltipProvider>,
    );
    fireEvent.click(addButton());
    expect(onAddToQuote).toHaveBeenCalledWith(250, 10);
  });

  it('InlinePriceCalculator repassa o preço da faixa da quantidade, não o preço base', async () => {
    const rows: Record<string, unknown[]> = {
      product_variants: [{ id: 'var-1' }],
      variant_supplier_sources: [
        { id: 'src-1', cost_price_1: 5, min_qty_1: 100, cost_price_2: 4, min_qty_2: 500 },
      ],
    };
    vi.mocked(dbInvoke).mockImplementation(<T,>(opts: InvokeOptions) =>
      Promise.resolve({ records: (rows[opts.table] ?? []) as T[], count: null }),
    );
    const onAddToQuote = vi.fn();
    render(
      <TooltipProvider>
        <InlinePriceCalculator
          productId="prod-1"
          productName="Caneca"
          basePrice={10}
          minQuantity={100}
          defaultOpen
          onAddToQuote={onAddToQuote}
        />
      </TooltipProvider>,
    );
    // Faixa 500+ un: custo 4 × markup (10/5) = R$ 8,00/un.
    await waitFor(() => expect(screen.getAllByText(/8,00/).length).toBeGreaterThan(0));
    fireEvent.change(screen.getByLabelText('Quantidade'), { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: /^Orçar 500 un$/ }));
    expect(onAddToQuote).toHaveBeenCalledWith(500, 8);
  });
});
