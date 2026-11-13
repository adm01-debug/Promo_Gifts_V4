import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ItemCard } from '@/components/kit-builder/ItemCard';
import { BoxSelector } from '@/components/kit-builder/BoxSelector';
import { KitHeroPricingCard } from '@/components/kit-builder/KitHeroPricingCard';
import { KitPricingCard } from '@/components/kit-builder/kit-summary/KitPricingCard';
import { KitCompositionCard } from '@/components/kit-builder/kit-summary/KitCompositionCard';
import { KitActionsBar } from '@/components/kit-builder/kit-summary/KitActionsBar';
import { KitPresentablePreview } from '@/components/kit-builder/KitPresentablePreview';
import type { KitBox, KitItem, KitState } from '@/lib/kit-builder';

const item: KitItem = {
  id: 'item',
  name: 'Produto sem preço',
  sku: 'SKU',
  imageUrl: null,
  price: 0,
  priceKnown: false,
  quantity: 2,
  width: 1,
  height: 1,
  depth: 1,
  volume: 1,
  stock: 5,
};
const box: KitBox = {
  id: 'box',
  name: 'Caixa sem preço',
  sku: 'BOX',
  imageUrl: null,
  price: 0,
  priceKnown: false,
  internalWidth: 20,
  internalHeight: 20,
  internalDepth: 20,
  internalVolume: 8000,
};
const kit: KitState = {
  name: 'Kit',
  kitType: 'montado',
  box,
  items: [item],
  personalization: { box: { enabled: false }, items: {} },
  totalItemsVolume: 2,
  availableVolume: 7998,
  volumeUsagePercent: 1,
  totalWeight: 0,
  boxPrice: 0,
  itemsPrice: 0,
  personalizationPrice: 0,
  totalPrice: 0,
  isValid: false,
  validationErrors: ['Há preço não informado ou inválido no kit'],
};
afterEach(cleanup);
function assertNoFakeZero() {
  expect(screen.queryByText(/R\$\s*0,00/)).not.toBeInTheDocument();
}

describe('Financial availability is visible without inventing zero prices', () => {
  it.each(['grid', 'list'] as const)('keeps unknown items selectable in the %s card', (view) => {
    const add = vi.fn();
    render(
      <TooltipProvider>
        <ItemCard
          item={{ ...item, compatibility: null }}
          view={view}
          isSelected={false}
          boxSelected={false}
          onAdd={add}
          onRemove={vi.fn()}
        />
      </TooltipProvider>,
    );
    expect(screen.getByText(item.name)).toBeInTheDocument();
    expect(screen.getByText('Não informado')).toBeInTheDocument();
    assertNoFakeZero();
    fireEvent.click(screen.getByRole('button', { name: /Adicionar/i }));
    expect(add).toHaveBeenCalledOnce();
  });
  it('shows both unknown boxes and their factual labels rather than removing them', () => {
    render(
      <MemoryRouter>
        <TooltipProvider>
          <BoxSelector
            boxes={[box]}
            selectedBox={null}
            kitItems={[]}
            isLoading={false}
            filters={{}}
            onFiltersChange={vi.fn()}
            onSelect={vi.fn()}
            onClear={vi.fn()}
          />
        </TooltipProvider>
      </MemoryRouter>,
    );
    expect(screen.getAllByText(box.name).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Não informado').length).toBeGreaterThan(0);
    assertNoFakeZero();
  });
  it('does not show a ready badge or partial money total in the hero', () => {
    render(
      <KitHeroPricingCard
        unitPrice={0}
        total={0}
        kitQuantity={2}
        hasContent
        isValid
        pricesKnown={false}
      />,
    );
    expect(screen.getAllByText('Não informado')).toHaveLength(2);
    assertNoFakeZero();
    expect(screen.queryByText('Pronto')).not.toBeInTheDocument();
  });
  it('keeps composition metadata while showing unknown per-line and total prices', () => {
    render(
      <MemoryRouter>
        <TooltipProvider>
          <KitCompositionCard kitState={kit} kitQuantity={2} stockByProduct={new Map()} />
        </TooltipProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText(item.name)).toBeInTheDocument();
    expect(screen.getAllByText('Não informado').length).toBeGreaterThan(1);
    assertNoFakeZero();
  });
  it('does not generate a money breakdown or quantity discount from unknown prices', () => {
    render(<KitPricingCard kitState={kit} kitQuantity={2} onKitQuantityChange={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Não informado');
    assertNoFakeZero();
    expect(screen.getAllByText(/Não informado/).length).toBeGreaterThan(1);
  });
  it('uses the same honest values in the printable presentation', () => {
    render(<KitPresentablePreview kitState={kit} kitQuantity={2} kitName="Kit" />);
    expect(screen.getAllByText('Não informado')).toHaveLength(2);
    assertNoFakeZero();
  });
  it('blocks PDF, quote, draft persistence and WhatsApp while prices are unknown', () => {
    const pdf = vi.fn(),
      save = vi.fn(),
      quote = vi.fn();
    render(
      <KitActionsBar
        isValid
        pricesKnown={false}
        kitName="Kit"
        kitQuantity={2}
        unitPrice={0}
        total={0}
        items={[item]}
        onExportPDF={pdf}
        onAddToQuote={quote}
        onSaveDraft={save}
      />,
    );
    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }
    expect(pdf).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    expect(quote).not.toHaveBeenCalled();
  });
  it('keeps existing markup and actions for a genuine known zero', () => {
    const view = render(
      <KitHeroPricingCard unitPrice={0} total={0} kitQuantity={2} hasContent isValid />,
    );
    const before = view.container.innerHTML;
    view.rerender(
      <KitHeroPricingCard unitPrice={0} total={0} kitQuantity={2} hasContent isValid pricesKnown />,
    );
    expect(view.container.innerHTML).toBe(before);
    expect(screen.getAllByText(/R\$\s*0,00/)).toHaveLength(2);
    expect(screen.getByText('Pronto')).toBeInTheDocument();
  });
});
