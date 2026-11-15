import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ProductCardActions } from '../ProductCardActions';

vi.mock('../QuickAddToQuote', () => ({
  QuickAddToQuote: () => <button type="button" data-testid="quick-add-stub" />,
}));

function renderActions(actionsOpen: boolean) {
  return render(
    <TooltipProvider>
      <ProductCardActions
        productId="p1"
        productName="Produto"
        productPrice={10}
        productMinQuantity={1}
        isFavorited={false}
        isInCompare={false}
        canAddToCompare
        actionsOpen={actionsOpen}
        onToggleActions={vi.fn()}
        onFavorite={vi.fn()}
        onCompare={vi.fn()}
        onOpenVariantPicker={vi.fn()}
        onQuickView={vi.fn()}
        markBusy={vi.fn()}
      />
    </TooltipProvider>,
  );
}

// A coluna de ações (absolute z-30) ocupa a altura da lista recolhida e cobria as
// bolinhas de cor do card ("intercepts pointer events" no e2e). O wrapper não pode
// capturar cliques; só o FAB e a lista aberta podem.
describe('ProductCardActions — pointer-events', () => {
  it('wrapper não captura cliques e o FAB continua clicável (fechado)', () => {
    renderActions(false);
    const toggle = screen.getByTestId('product-card-actions-toggle');
    const wrapper = toggle.parentElement!;
    expect(wrapper.className).toContain('pointer-events-none');
    expect(toggle.className).toContain('pointer-events-auto');
    const list = screen.getByTestId('product-card-quote').parentElement!;
    expect(list.className).toContain('pointer-events-none');
  });

  it('lista aberta volta a receber cliques', () => {
    renderActions(true);
    const list = screen.getByTestId('product-card-quote').parentElement!;
    expect(list.className).toContain('pointer-events-auto');
    expect(list.className).not.toContain('pointer-events-none');
  });
});
