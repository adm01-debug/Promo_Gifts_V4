import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QuantityCalculator } from '../QuantityCalculator';
import { InlinePriceCalculator } from '../../InlinePriceCalculator';

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

const addButton = () => screen.getByRole('button', { name: /Adicionar 250 un ao\s*Orçamento/ });

describe('QuantityCalculator — botão "Adicionar N un ao Orçamento" (PM-05)', () => {
  it.each([
    ['compacto', true],
    ['expandido', false],
  ])('modo %s: clicar chama onAddToQuote com a quantidade digitada', (_label, compact) => {
    const onAddToQuote = vi.fn();
    render(
      <TooltipProvider>
        <QuantityCalculator {...baseProps} compact={compact} onAddToQuote={onAddToQuote} />
      </TooltipProvider>,
    );
    fireEvent.click(addButton());
    expect(onAddToQuote).toHaveBeenCalledTimes(1);
    expect(onAddToQuote).toHaveBeenCalledWith(250);
  });

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
    expect(onAddToQuote).toHaveBeenCalledWith(250);
  });
});
