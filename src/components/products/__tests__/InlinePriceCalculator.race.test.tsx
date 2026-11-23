import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InlinePriceCalculator } from '../InlinePriceCalculator';

type DeferredCall = { table: string; resolve: (value: unknown) => void };

const state = vi.hoisted(() => ({ calls: [] as DeferredCall[] }));

vi.mock('@/lib/db/postgrest', () => ({
  dbInvoke: vi.fn(
    (args: { table: string }) =>
      new Promise((resolve) => {
        state.calls.push({ table: args?.table, resolve });
      }),
  ),
}));

vi.mock('@/components/products/inline-price/PriceTiersTable', () => ({
  PriceTiersTable: ({ tiers }: { tiers: Array<{ unitPrice: number }> }) => (
    <div data-testid="tiers">{tiers.map((tier) => String(tier.unitPrice)).join('|')}</div>
  ),
}));

vi.mock('@/components/products/inline-price/QuantityCalculator', () => ({
  QuantityCalculator: () => <div data-testid="quantity" />,
}));

// O markup é derivado do próprio custo, então duas variantes com custos
// diferentes exibem o mesmo preço final. A diferença que o teste observa é a
// QUANTIDADE de faixas: a variante A tem duas, a B tem uma.
const sourceWithCosts = (costs: number[]) => {
  const source: Record<string, number | string> = { id: 'source', cost_price: costs[0] };
  costs.forEach((cost, index) => {
    source[`cost_price_${index + 1}`] = cost;
    source[`min_qty_${index + 1}`] = index === 0 ? 1 : 100 * index;
  });
  return source;
};

const respond = async (index: number, records: unknown[]) => {
  await act(async () => {
    state.calls[index].resolve({ records });
    await Promise.resolve();
  });
};

describe('corrida na busca de faixas de preço (ACH-043)', () => {
  it('mostra as faixas da variante selecionada quando a resposta anterior chega depois', async () => {
    const { rerender } = render(
      <InlinePriceCalculator
        productId="PROD-1"
        variantId="VAR-A"
        basePrice={20}
        productName="Produto"
        defaultOpen
      />,
    );

    rerender(
      <InlinePriceCalculator
        productId="PROD-1"
        variantId="VAR-B"
        basePrice={20}
        productName="Produto"
        defaultOpen
      />,
    );

    expect(state.calls[0].table).toBe('product_variants');
    expect(state.calls[1].table).toBe('product_variants');

    await respond(1, [{ id: 'VAR-B' }]);
    expect(state.calls[2].table).toBe('variant_supplier_sources');
    await respond(2, [sourceWithCosts([20])]);

    // A busca da variante anterior é descartada logo depois de responder: nem
    // chega a consultar o fornecedor, então nenhuma chamada nova aparece.
    await respond(0, [{ id: 'VAR-A' }]);
    expect(state.calls).toHaveLength(3);

    expect(screen.getByTestId('tiers').textContent).toBe('20');
  });
});
