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

const queryResult = <T>(data: T) => {
  const result = Promise.resolve({ data, error: null });
  return Object.assign(result, {
    order: () => Promise.resolve({ data, error: null }),
  });
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(supabase.from).mockImplementation(
    () =>
      ({
        select: () => ({
          eq: () => queryResult([]),
        }),
      }) as never,
  );
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
    const insertItems = vi.fn().mockReturnValue({
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

  it('update preserva identidade/campos comerciais e declara remoções explicitamente', async () => {
    vi.mocked(supabase.from).mockImplementation(
      () =>
        ({
          select: () => ({
            eq: () =>
              queryResult([
                { id: 'keep', sort_order: 0 },
                { id: 'remove', sort_order: 1 },
              ]),
          }),
        }) as never,
    );
    const kept: QuoteItem = {
      ...makeItem('produto', 2, 5),
      id: 'keep',
      product_description: 'Descrição congelada',
      personalization_config: { source: 'editor' },
      personalization_cost: 5,
      has_personalization: true,
      mockup_urls: ['https://cdn.example/mockup.png'],
      artwork_urls: ['https://cdn.example/art.svg'],
      discount_percentage: 3,
      discount_amount: 1.2,
      selected_packaging_id: 'packaging-id',
      selected_packaging_name: 'Caixa premium',
      selected_packaging_unit_cost: 4.5,
    };

    await quoteService.updateQuote('q', { status: 'draft' }, [kept], 7);
    const args = vi.mocked(supabase.rpc).mock.calls[0][1] as unknown as {
      _quote_patch: { _removed_item_ids: string[] };
      _items: Array<Record<string, unknown>>;
    };
    expect(args._quote_patch._removed_item_ids).toEqual(['remove']);
    expect(args._items[0]).toMatchObject({
      id: 'keep',
      product_description: 'Descrição congelada',
      personalization_config: { source: 'editor' },
      mockup_urls: ['https://cdn.example/mockup.png'],
      artwork_urls: ['https://cdn.example/art.svg'],
      discount_percentage: 3,
      discount_amount: 1.2,
      selected_packaging_id: 'packaging-id',
      selected_packaging_name: 'Caixa premium',
      selected_packaging_unit_cost: 4.5,
    });
  });

  it('reidrata IDs por sort_order para que um segundo save preserve a identidade', async () => {
    let quoteItemsRead = 0;
    vi.mocked(supabase.from).mockImplementation(
      () =>
        ({
          select: () => ({
            eq: () => {
              quoteItemsRead += 1;
              return quoteItemsRead === 1
                ? queryResult([])
                : queryResult([{ id: 'persisted-new-item', sort_order: 0 }]);
            },
          }),
        }) as never,
    );

    const result = await quoteService.updateQuote(
      'q',
      { status: 'draft' },
      [makeItem('novo', 1, 0)],
      7,
    );

    expect(result.items?.[0]?.id).toBe('persisted-new-item');
  });

  it('rejeita update sem versão antes de consultar ou chamar a RPC', async () => {
    await expect(
      quoteService.updateQuote('q', { status: 'draft' }, [makeItem('produto', 1, 0)]),
    ).rejects.toThrow(/Versão do orçamento ausente/);
    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});
