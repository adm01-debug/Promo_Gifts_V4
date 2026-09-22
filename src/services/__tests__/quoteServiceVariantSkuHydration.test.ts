import { describe, it, expect, vi, beforeEach } from 'vitest';
import { quoteService } from '@/services/quoteService';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

type Row = Record<string, unknown>;
const selectedColumns = new Map<string, string>();

/**
 * Builder de mock para a chain `supabase.from(table)` por tabela.
 * fetchQuote chama nesta ordem:
 *  1) from('quotes').select('*').eq('id').single()
 *  2) from('quote_items').select('*').eq('quote_id').order(...)
 *  3) from('quote_item_personalizations').select('*').in(...)
 *  4) from('products').select(...).in('id', ...)            [hidratação categorias]
 *  5) from('product_variants').select(...).in('product_id').eq('is_active') [SKU]
 */
function installFromMock(tables: Record<string, { data: Row | Row[] | null; error?: unknown }>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fromFn = supabase.from as unknown as ReturnType<typeof vi.fn>;
  fromFn.mockImplementation((table: string) => {
    const result = tables[table] ?? { data: [], error: null };
    const thenable = {
      data: result.data,
      error: result.error ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      then(cb: any) {
        return Promise.resolve({ data: result.data, error: result.error ?? null }).then(cb);
      },
    };
    const chain: Record<string, unknown> = {
      select: (columns: string) => {
        selectedColumns.set(table, columns);
        return chain;
      },
      eq: () => chain,
      in: () => chain,
      order: () => Promise.resolve({ data: result.data, error: result.error ?? null }),
      single: () => Promise.resolve({ data: result.data, error: result.error ?? null }),
      maybeSingle: () => Promise.resolve({ data: result.data, error: result.error ?? null }),
      then: thenable.then,
    };
    return chain;
  });
}

describe('quoteService.fetchQuote — hidratação de SKU composto (variante)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectedColumns.clear();
  });

  it('carrega explicitamente identidade, tamanho, kit e versão de concorrência', async () => {
    installFromMock({ quotes: { data: { id: 'q', status: 'draft' } }, quote_items: { data: [] } });
    await quoteService.fetchQuote('q');
    expect(selectedColumns.get('quote_items')?.split(',')).toEqual(
      expect.arrayContaining([
        'product_variant_id',
        'size_code',
        'gender',
        'kit_group_id',
        'kit_name',
        'bitrix_product_id',
        'price_confirmed_at',
        'price_updated_at',
        'price_freshness_threshold_days',
      ]),
    );
    expect(selectedColumns.get('quotes')?.split(',')).toEqual(
      expect.arrayContaining(['version', 'negotiation_markup_percent']),
    );
  });

  it.each([
    ['P', 'SKU-P'],
    ['G', 'SKU-G'],
  ])('hidrata a cor PRETO sem trocar tamanho %s', async (size, sku) => {
    installFromMock({
      quotes: { data: { id: 'q', status: 'draft' } },
      quote_items: {
        data: [
          { id: 'i', product_id: 'p', product_sku: 'BASE', color_name: 'PRETO', size_code: size },
        ],
      },
      product_variants: {
        data: [
          { id: 'v-p', product_id: 'p', color_name: 'PRETO', size_code: 'P', sku: 'SKU-P' },
          { id: 'v-g', product_id: 'p', color_name: 'PRETO', size_code: 'G', sku: 'SKU-G' },
        ],
      },
    });
    expect((await quoteService.fetchQuote('q'))?.items?.[0].product_sku).toBe(sku);
  });

  it('não adivinha tamanho quando duas variantes têm a mesma cor', async () => {
    installFromMock({
      quotes: { data: { id: 'q', status: 'draft' } },
      quote_items: {
        data: [{ id: 'i', product_id: 'p', product_sku: 'BASE', color_name: 'PRETO' }],
      },
      product_variants: {
        data: [
          { id: 'v-p', product_id: 'p', color_name: 'PRETO', size_code: 'P', sku: 'SKU-P' },
          { id: 'v-g', product_id: 'p', color_name: 'PRETO', size_code: 'G', sku: 'SKU-G' },
        ],
      },
    });
    expect((await quoteService.fetchQuote('q'))?.items?.[0].product_sku).toBe('BASE');
  });

  it('identidade explícita prevalece sobre cor antiga e nunca usa variante de outro produto', async () => {
    installFromMock({
      quotes: { data: { id: 'q', status: 'draft' } },
      quote_items: {
        data: [
          {
            id: 'i1',
            product_id: 'p',
            product_variant_id: 'v-g',
            product_sku: 'BASE',
            color_name: 'Cor antiga',
          },
          {
            id: 'i2',
            product_id: 'p',
            product_variant_id: 'v-other',
            product_sku: 'BASE',
            color_name: 'PRETO',
          },
        ],
      },
      product_variants: {
        data: [
          { id: 'v-g', product_id: 'p', color_name: 'PRETO', size_code: 'G', sku: 'SKU-G' },
          { id: 'v-other', product_id: 'other', color_name: 'PRETO', sku: 'WRONG' },
        ],
      },
    });
    const quote = await quoteService.fetchQuote('q');
    expect(quote?.items?.[0].product_sku).toBe('SKU-G');
    expect(quote?.items?.[1].product_sku).toBe('BASE');
  });

  it('substitui product_sku base por SKU composto da variante (94297 → 94297-7.1)', async () => {
    installFromMock({
      quotes: { data: { id: 'q-1' } },
      quote_items: {
        data: [
          {
            id: 'i-1',
            product_id: 'prod-94297',
            product_name: 'Garrafa esportiva',
            product_sku: '94297',
            color_name: 'LARANJA',
          },
        ],
      },
      quote_item_personalizations: { data: [] },
      products: { data: [] },
      product_variants: {
        data: [
          { product_id: 'prod-94297', sku: '94297-7.1', color_name: 'LARANJA' },
          { product_id: 'prod-94297', sku: '94297-3.2', color_name: 'AZUL' },
        ],
      },
    });

    const quote = await quoteService.fetchQuote('q-1');
    expect(quote?.items?.[0].product_sku).toBe('94297-7.1');
  });

  it('preserva product_sku que já contém sufixo (não toca em itens novos)', async () => {
    installFromMock({
      quotes: { data: { id: 'q-2' } },
      quote_items: {
        data: [
          {
            id: 'i-2',
            product_id: 'prod-x',
            product_name: 'X',
            product_sku: '94297-7.1',
            color_name: 'LARANJA',
          },
        ],
      },
      quote_item_personalizations: { data: [] },
      products: { data: [] },
      product_variants: { data: [] },
    });

    const quote = await quoteService.fetchQuote('q-2');
    expect(quote?.items?.[0].product_sku).toBe('94297-7.1');
  });

  it('faz match case-insensitive de color_name', async () => {
    installFromMock({
      quotes: { data: { id: 'q-3' } },
      quote_items: {
        data: [
          {
            id: 'i-3',
            product_id: 'prod-1',
            product_name: 'Y',
            product_sku: 'PV00570',
            color_name: 'colorido',
          },
        ],
      },
      quote_item_personalizations: { data: [] },
      products: { data: [] },
      product_variants: {
        data: [{ product_id: 'prod-1', sku: 'PV00570-COL', color_name: 'Colorido' }],
      },
    });

    const quote = await quoteService.fetchQuote('q-3');
    expect(quote?.items?.[0].product_sku).toBe('PV00570-COL');
  });

  it('quando variante não é encontrada, mantém SKU base e registra warn (fallback)', async () => {
    installFromMock({
      quotes: { data: { id: 'q-4' } },
      quote_items: {
        data: [
          {
            id: 'i-4',
            product_id: 'prod-orphan',
            product_name: 'Z',
            product_sku: '53791',
            color_name: 'NATURAL',
          },
        ],
      },
      quote_item_personalizations: { data: [] },
      products: { data: [] },
      product_variants: {
        data: [{ product_id: 'prod-orphan', sku: '53791-OTHER', color_name: 'PRETO' }],
      },
    });

    const quote = await quoteService.fetchQuote('q-4');
    expect(quote?.items?.[0].product_sku).toBe('53791');
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('variant sku not found'),
      expect.objectContaining({
        product_id: 'prod-orphan',
        color_name: 'NATURAL',
        base_sku: '53791',
      }),
    );
  });

  it('itens sem color_name não disparam lookup nem warn', async () => {
    installFromMock({
      quotes: { data: { id: 'q-5' } },
      quote_items: {
        data: [{ id: 'i-5', product_id: 'prod-a', product_name: 'A', product_sku: 'SKU-A' }],
      },
      quote_item_personalizations: { data: [] },
      products: { data: [] },
      product_variants: { data: [] },
    });

    const quote = await quoteService.fetchQuote('q-5');
    expect(quote?.items?.[0].product_sku).toBe('SKU-A');
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
