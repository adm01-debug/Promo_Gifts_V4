import { beforeEach, describe, expect, it, vi } from 'vitest';
import { quoteService } from '../quoteService';
import { supabase } from '@/integrations/supabase/client';
import type { QuoteItem } from '@/hooks/quotes/quoteTypes';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: vi.fn(), from: vi.fn() } }));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const makeItem = (product: string, qty: number, cost: number): QuoteItem => ({
  product_id: product,
  product_variant_id: `variant-${product}`,
  product_name: product,
  color_name: 'Preto',
  quantity: qty,
  unit_price: 20,
  personalizations: [{ technique_id: `technique-${product}`, total_cost: cost }],
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(supabase.rpc).mockResolvedValue({
    data: { id: 'q', quote_number: 'ORC-001' },
    error: null,
  } as never);
});

describe('orçamento — associação de personalização após filtrar itens', () => {
  it.each(['create', 'update'] as const)(
    '%s associa cada arte ao item correto e calcula só linhas persistíveis',
    async (operation) => {
      const items = [makeItem('descartado', 0, 8), makeItem('valido', 1, 5)];
      const result =
        operation === 'create'
          ? await quoteService.createQuote({ status: 'draft' }, items, 'seller', 'org')
          : await quoteService.updateQuote('q', { status: 'draft' }, items, 7);
      const args = vi.mocked(supabase.rpc).mock.calls[0][1] as unknown as {
        _quote?: { subtotal: number };
        _quote_patch?: { subtotal: number };
        _expected_version?: number;
        _items: Array<{
          product_id: string;
          product_variant_id: string;
          personalizations: Array<{ technique_id: string }>;
        }>;
      };
      expect(args._items).toHaveLength(1);
      expect(args._items[0]).toMatchObject({
        product_id: 'valido',
        product_variant_id: 'variant-valido',
      });
      expect(args._items[0].personalizations[0].technique_id).toBe('technique-valido');
      expect((args._quote ?? args._quote_patch)?.subtotal).toBe(25);
      expect(result.items).toHaveLength(1);
      if (operation === 'update') expect(args._expected_version).toBe(7);
    },
  );

  it('caminho de inserção direta não aplica a arte descartada ao primeiro ID retornado', async () => {
    const insertPers = vi.fn().mockResolvedValue({ error: null });
    const insertItems = vi
      .fn()
      .mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [{ id: 'saved-valid' }], error: null }),
      });
    vi.mocked(supabase.from).mockImplementation(
      (table) =>
        (table === 'quote_items' ? { insert: insertItems } : { insert: insertPers }) as never,
    );
    await quoteService.insertItemsWithPersonalizations(
      [makeItem('descartado', 0, 8), makeItem('valido', 1, 5)],
      'q',
    );
    expect(insertPers).toHaveBeenCalledWith([
      expect.objectContaining({ quote_item_id: 'saved-valid', technique_id: 'technique-valido' }),
    ]);
  });
});
