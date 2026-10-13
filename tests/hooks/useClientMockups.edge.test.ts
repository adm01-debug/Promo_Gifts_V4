/**
 * Casos de BORDA de `useClientMockups` (mockups do cliente — plano etapa 37; cartão t_f753ee81,
 * filho do cartão de implementação t_f5f7f446). O caminho feliz está em
 * `src/hooks/mockup/__tests__/useClientMockups.test.ts`; aqui ficam os limites: cliente
 * ausente/em branco; lixeira (`deleted_at`), inclusive com o cliente inteiro na lixeira e com a
 * coluna ainda ausente (pré-migration da etapa 6); ordenação com empate e data inválida; e o
 * cliente com 500 mockups (página padrão, não varredura; o teto é parâmetro).
 *
 * O "banco" abaixo é um mini-PostgREST em memória que honra `eq`/`order`/`limit` como o real:
 * sem isso o teto de página e o filtro por cliente seriam decorativos.
 * Run: npx vitest run tests/hooks/useClientMockups.edge.test.ts
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/** Campos que este cartão de borda observa (nome do produto/técnica são do teste do cartão pai). */
type Row = {
  id: string;
  client_id: string | null;
  mockup_url: string | null;
  thumbnail_url: string | null;
  created_at: string;
  deleted_at?: string | null;
};

type QueryState = {
  filters: Array<[string, unknown]>;
  order: { column: string; ascending: boolean } | null;
  limit: number | null;
};

const h = vi.hoisted(() => ({
  calls: [] as Array<{ method: string; args: unknown[] }>,
  signCalls: [] as string[],
  rows: [] as Array<Record<string, unknown>>,
  tableError: null as unknown,
}));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/integrations/supabase/client', () => {
  const asTime = (value: unknown) => {
    const t = Date.parse(String(value));
    return Number.isNaN(t) ? -Infinity : t;
  };

  const resolveQuery = (state: QueryState) => {
    if (h.tableError) return { data: null, error: h.tableError };
    let rows = h.rows.filter((row) => state.filters.every(([col, val]) => row[col] === val));
    if (state.order) {
      const { column, ascending } = state.order;
      rows = [...rows].sort((a, b) =>
        ascending ? asTime(a[column]) - asTime(b[column]) : asTime(b[column]) - asTime(a[column]),
      );
    }
    if (state.limit !== null) rows = rows.slice(0, state.limit);
    return { data: rows, error: null };
  };

  const makeQuery = () => {
    const state: QueryState = { filters: [], order: null, limit: null };
    const q: Record<string, unknown> = {};
    const chain = (method: string) =>
      vi.fn((...args: unknown[]) => {
        h.calls.push({ method, args });
        if (method === 'eq') state.filters.push([args[0] as string, args[1]]);
        if (method === 'order') {
          const opts = args[1] as { ascending?: boolean } | undefined;
          state.order = { column: args[0] as string, ascending: opts?.ascending === true };
        }
        if (method === 'limit') state.limit = args[0] as number;
        return q;
      });
    for (const m of ['select', 'eq', 'order', 'limit']) q[m] = chain(m);
    (q as { then?: unknown }).then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
      Promise.resolve(resolveQuery(state)).then(res, rej);
    return q;
  };

  return {
    supabase: {
      from: vi.fn(() => makeQuery()),
      storage: {
        from: vi.fn(() => ({
          createSignedUrl: vi.fn((path: string) => {
            h.signCalls.push(path);
            return { data: { signedUrl: `https://signed.example.com/${path}` }, error: null };
          }),
        })),
      },
    },
  };
});

import { supabase } from '@/integrations/supabase/client';
import {
  DEFAULT_CLIENT_MOCKUPS_LIMIT,
  fetchClientMockups,
  useClientMockups,
} from '@/hooks/mockup/useClientMockups';

const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>;
const BASE = 'https://proj.supabase.co/storage/v1/object/public/mockup-assets';

const mkRow = (over: Partial<Row> = {}): Row => {
  const id = over.id ?? 'm1';
  const url = `${BASE}/user-1/mockups/${id}.png`;
  return {
    id,
    client_id: 'crm-42',
    mockup_url: url,
    thumbnail_url: url,
    created_at: '2026-10-01T10:00:00.000Z',
    deleted_at: null,
    ...over,
  };
};

/** 500 mockups do mesmo cliente, do mais antigo (mk-001) ao mais novo (mk-500). */
const buildRows = (total: number): Row[] =>
  Array.from({ length: total }, (_, i) =>
    mkRow({
      id: `mk-${String(i + 1).padStart(3, '0')}`,
      client_id: 'crm-500',
      created_at: new Date(Date.UTC(2026, 0, 1) + i * 60_000).toISOString(),
    }),
  );

const lastCall = (method: string) => h.calls.filter((c) => c.method === method).pop();
const makeQc = () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
const wrapper = (qc: QueryClient) => {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
};

beforeEach(() => {
  h.calls.length = 0;
  h.signCalls.length = 0;
  h.rows.length = 0;
  h.tableError = null;
  fromMock.mockClear();
});

describe('sem client_id — lista vazia sem erro', () => {
  it('cliente ausente ou em branco devolve [] sem tocar no banco', async () => {
    h.rows.push(mkRow());
    for (const vazio of [null, undefined, '', '   ', '\n\t']) {
      expect(await fetchClientMockups(vazio)).toEqual([]);
    }
    expect(fromMock).not.toHaveBeenCalled();
    expect(h.signCalls).toHaveLength(0);
  });

  it('no hook, cliente em branco resolve sucesso com lista vazia (não fica pendente nem erra)', async () => {
    h.rows.push(mkRow());
    const { result } = renderHook(() => useClientMockups('   '), { wrapper: wrapper(makeQc()) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
    expect(result.current.isError).toBe(false);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('cliente só com espaços em volta é consultado já aparado', async () => {
    h.rows.push(mkRow({ id: 'do-cliente' }), mkRow({ id: 'outro', client_id: 'crm-42x' }));

    expect((await fetchClientMockups('  crm-42  ')).map((m) => m.id)).toEqual(['do-cliente']);
    expect(lastCall('eq')).toEqual({ method: 'eq', args: ['client_id', 'crm-42'] });
  });
});

describe('lixeira (deleted_at)', () => {
  it('item na lixeira sai da lista e não gera miniatura assinada', async () => {
    h.rows.push(
      mkRow({ id: 'vivo' }),
      mkRow({ id: 'lixeira', deleted_at: '2026-10-02T00:00:00.000Z' }),
    );

    const result = await fetchClientMockups('crm-42');
    expect(result.map((m) => m.id)).toEqual(['vivo']);
    expect(h.signCalls).toEqual(['user-1/mockups/vivo.png']);
  });

  it('cliente com TODOS os mockups na lixeira devolve [] e nenhuma assinatura', async () => {
    h.rows.push(
      mkRow({ id: 'a', deleted_at: '2026-10-02T00:00:00.000Z' }),
      mkRow({ id: 'b', deleted_at: '2026-10-03T00:00:00.000Z' }),
      mkRow({ id: 'c', deleted_at: '2026-10-04T00:00:00.000Z' }),
    );

    expect(await fetchClientMockups('crm-42')).toEqual([]);
    expect(h.signCalls).toHaveLength(0);
  });

  it('só deleted_at nulo/ausente é item vivo (marca preenchida — até string vazia — é lixeira)', async () => {
    h.rows.push(
      mkRow({ id: 'nulo', deleted_at: null, created_at: '2026-10-01T00:00:00.000Z' }),
      mkRow({ id: 'sem-coluna', created_at: '2026-10-02T00:00:00.000Z' }),
      mkRow({ id: 'vazio', deleted_at: '', created_at: '2026-10-03T00:00:00.000Z' }),
    );

    const lixeiraResult = await fetchClientMockups('crm-42');
    expect(lixeiraResult.map((m) => m.id)).toEqual(['sem-coluna', 'nulo']);
  });
});

describe('ordenação por data', () => {
  it('mais recente primeiro, empate preservado e data inválida no fim', async () => {
    h.rows.push(
      mkRow({ id: 'antigo', created_at: '2026-01-01T00:00:00.000Z' }),
      mkRow({ id: 'novo-a', created_at: '2026-10-01T10:00:00.000Z' }),
      mkRow({ id: 'sem-data', created_at: 'não-é-data' }),
      mkRow({ id: 'novo-b', created_at: '2026-10-01T10:00:00.000Z' }),
    );

    const result = await fetchClientMockups('crm-42');
    expect(result.map((m) => m.id)).toEqual(['novo-a', 'novo-b', 'antigo', 'sem-data']);
    expect(lastCall('order')).toEqual({
      method: 'order',
      args: ['created_at', { ascending: false }],
    });
  });
});

describe('cliente com 500 mockups — página, não varredura', () => {
  it('devolve só a página padrão (200) e a mais recente vem primeiro, em uma consulta só', async () => {
    h.rows.push(...buildRows(500));
    const result = await fetchClientMockups('crm-500');
    expect(fromMock).toHaveBeenCalledTimes(1);
    expect(lastCall('limit')).toEqual({ method: 'limit', args: [DEFAULT_CLIENT_MOCKUPS_LIMIT] });
    expect(result).toHaveLength(DEFAULT_CLIENT_MOCKUPS_LIMIT);
    expect(result[0].id).toBe('mk-500');
    expect(result[result.length - 1].id).toBe('mk-301');
  });

  it('limit explícito pede a página inteira — o teto é parâmetro, não chute', async () => {
    h.rows.push(...buildRows(500));
    const result = await fetchClientMockups('crm-500', { limit: 500 });
    expect(lastCall('limit')).toEqual({ method: 'limit', args: [500] });
    expect(result).toHaveLength(500);
    expect(result.at(-1)?.id).toBe('mk-001');
  });
});

describe('falha da consulta — erro não vira lista vazia', () => {
  it('o erro do banco é propagado pelo serviço e exposto pelo hook', async () => {
    h.tableError = new Error('select boom');

    await expect(fetchClientMockups('crm-42')).rejects.toThrow('select boom');

    const { result } = renderHook(() => useClientMockups('crm-42'), { wrapper: wrapper(makeQc()) });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
    expect((result.current.error as Error).message).toBe('select boom');
  });
});
