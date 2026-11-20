/**
 * useProductionLeadTime — o cliente Supabase é trocado por um responder por
 * tabela; a regra de cálculo (src/lib/lead-time) é a real.
 */
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Result = { data: unknown; error: unknown };

const h = vi.hoisted(() => {
  const state: { responders: Record<string, () => Result>; tablesRead: string[] } = {
    responders: {},
    tablesRead: [],
  };
  return state;
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      h.tablesRead.push(table);
      const proxy: Record<string, unknown> = {};
      for (const m of ['select', 'in', 'order', 'eq']) proxy[m] = () => proxy;
      proxy.then = (resolve: (r: Result) => unknown, reject: (e: unknown) => unknown) =>
        Promise.resolve(h.responders[table]?.() ?? { data: [], error: null }).then(resolve, reject);
      return proxy;
    },
  },
}));

vi.mock('@/hooks/freight/useFreightSettings', () => ({
  useFreightSettings: () => ({
    row: { internal_buffer_days: 1, multi_personalization_rule: 'max' },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

import { useProductionLeadTime } from '../useProductionLeadTime';

const PROD_A = 'prod-a';
const PROD_B = 'prod-b';
const SUPPLIER = 'sup-1';
const PAT_A = 'pat-a';
const PAT_B = 'pat-b';
const TABELA_A = 'tab-a';
const TABELA_B = 'tab-b';

let client = new QueryClient();

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  h.tablesRead = [];
  h.responders = {
    products: () => ({
      data: [
        { id: PROD_A, lead_time_days: null, supplier_id: SUPPLIER },
        { id: PROD_B, lead_time_days: 5, supplier_id: SUPPLIER },
      ],
      error: null,
    }),
    supplier_settings: () => ({
      data: [{ supplier_id: SUPPLIER, default_lead_time_days: 2 }],
      error: null,
    }),
    print_area_techniques: () => ({
      data: [
        {
          id: PAT_A,
          product_id: PROD_A,
          location_code: 'FRENTE',
          tabela_preco_id: TABELA_A,
          production_days: 3,
          is_active: true,
        },
        {
          id: PAT_B,
          product_id: PROD_B,
          location_code: 'FRENTE',
          tabela_preco_id: TABELA_B,
          production_days: null,
          is_active: true,
        },
      ],
      error: null,
    }),
    tabela_preco_gravacao_oficial_faixa: () => ({
      data: [
        {
          tabela_preco_gravacao_id: TABELA_B,
          quantidade_minima: 1,
          quantidade_maxima: 99,
          prazo_dias: 4,
        },
        {
          tabela_preco_gravacao_id: TABELA_B,
          quantidade_minima: 100,
          quantidade_maxima: 499,
          prazo_dias: 8,
        },
      ],
      error: null,
    }),
    business_calendar: () => ({
      data: [
        { day: '2026-12-08', description: 'Feriado de teste', created_at: '', created_by: null },
      ],
      error: null,
    }),
  };
});

const ITENS = [
  {
    productId: PROD_A,
    quantity: 50,
    personalizations: [{ techniqueId: PAT_A, locationCode: 'FRENTE', quantity: null }],
  },
  {
    productId: PROD_B,
    quantity: 200,
    personalizations: [{ techniqueId: PAT_B, locationCode: 'FRENTE', quantity: null }],
  },
];

describe('useProductionLeadTime', () => {
  it('2 itens: o mais demorado define o prazo e a data pula o feriado', async () => {
    const { result } = renderHook(
      () => useProductionLeadTime({ items: ITENS, approvedOn: null, today: '2026-11-23' }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.leadTime).not.toBeNull());
    const lead = result.current.leadTime;
    // A: fornecedor 2 (padrão) + personalização 3 (cadastrada) + folga 1 = 6
    // B: fornecedor 5 (exceção, padrão é 2) + personalização 8 (faixa 100–499 para 200 un.) + folga 1 = 14
    expect(lead?.status).toBe('ok');
    expect(lead?.perItem.map((i) => [i.productId, i.total, i.isCritical])).toEqual([
      [PROD_A, 6, false],
      [PROD_B, 14, true],
    ]);
    expect(lead?.perItem[1]).toMatchObject({
      supplierSource: 'product_exception',
      personalizationSource: 'price_table',
    });
    expect(lead?.perItem[0]).toMatchObject({
      supplierSource: 'supplier_default',
      personalizationSource: 'registered',
    });
    // 14 dias úteis a partir de seg 23/11/2026, pulando o feriado de ter 08/12:
    // 24,25,26,27/11 (4) + 30/11 (5) + 01,02,03,04/12 (9) + 07/12 (10) + 09,10,11/12 (13) + 14/12 (14)
    expect(lead?.totalDays).toBe(14);
    expect(lead?.readyDate).toBe('2026-12-14');
    expect(result.current.unlinkedItems).toBe(0);
  });

  it('personalização sem faixa para a quantidade bloqueia com pendência (quantidade 600 > 499)', async () => {
    const itens = [{ ...ITENS[1], quantity: 600 }];
    const { result } = renderHook(
      () => useProductionLeadTime({ items: itens, approvedOn: null, today: '2026-11-23' }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.leadTime).not.toBeNull());
    expect(result.current.leadTime?.status).toBe('dados_insuficientes');
    expect(result.current.leadTime?.readyDate).toBeNull();
    expect(result.current.leadTime?.missing[0]?.code).toBe('personalization_lead_time');
  });

  it('item sem produto vinculado fica fora e é contado', async () => {
    const itens = [...ITENS, { productId: null, quantity: 10, personalizations: [] }];
    const { result } = renderHook(
      () => useProductionLeadTime({ items: itens, approvedOn: null, today: '2026-11-23' }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.leadTime).not.toBeNull());
    expect(result.current.unlinkedItems).toBe(1);
    expect(result.current.leadTime?.perItem).toHaveLength(2);
  });

  it('sem nenhum produto vinculado não consulta o banco', () => {
    const { result } = renderHook(
      () =>
        useProductionLeadTime({
          items: [{ productId: null, quantity: 1, personalizations: [] }],
          approvedOn: null,
          today: '2026-11-23',
        }),
      { wrapper },
    );
    expect(result.current.leadTime).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(h.tablesRead).toEqual([]);
  });

  it('falha de leitura vira isError, sem prazo', async () => {
    h.responders.business_calendar = () => ({ data: null, error: { code: 'XX', message: 'x' } });
    const { result } = renderHook(
      () => useProductionLeadTime({ items: ITENS, approvedOn: null, today: '2026-11-23' }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.leadTime).toBeNull();
  });
});
