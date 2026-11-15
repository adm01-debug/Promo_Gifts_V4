/**
 * Testes de comportamento de useClientMockups (mockups do cliente — plano etapa 37).
 * Cobrem: consulta por client_id, lixeira ignorada, ordenação por data, caminho +
 * miniatura assinada, e [] sem client_id sem tocar no banco.
 * Run: npx vitest related --run src/hooks/mockup/useClientMockups.ts
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const h = vi.hoisted(() => ({
  calls: [] as Array<{ method: string; args: unknown[] }>,
  signCalls: [] as Array<{ path: string; ttl: number }>,
  tableResult: { data: [] as unknown, error: null as unknown },
  signedResult: {
    data: { signedUrl: 'https://signed.example.com/thumb.png' } as { signedUrl: string } | null,
    error: null as unknown,
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/integrations/supabase/client', () => {
  const makeBuilder = () => {
    const q: Record<string, unknown> = {};
    const chain = (method: string) =>
      vi.fn((...args: unknown[]) => {
        h.calls.push({ method, args });
        return q;
      });
    for (const m of ['select', 'eq', 'order', 'limit']) q[m] = chain(m);
    // Thenable: `await builder` resolve com o resultado da tabela.
    (q as { then?: unknown }).then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
      Promise.resolve(h.tableResult).then(res, rej);
    return q;
  };
  return {
    supabase: {
      from: vi.fn(() => makeBuilder()),
      storage: {
        from: vi.fn(() => ({
          createSignedUrl: vi.fn((path: string, ttl: number) => {
            h.signCalls.push({ path, ttl });
            return h.signedResult;
          }),
        })),
      },
    },
  };
});

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import {
  DEFAULT_CLIENT_MOCKUPS_LIMIT,
  MOCKUP_THUMBNAIL_TTL_SECONDS,
  extractMockupStoragePath,
  fetchClientMockups,
  isMockupTrashed,
  sortMockupsByCreatedAtDesc,
  useClientMockups,
} from '@/hooks/mockup/useClientMockups';

const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>;
const loggerWarn = logger.warn as unknown as ReturnType<typeof vi.fn>;
const BASE = 'https://proj.supabase.co/storage/v1/object/public/mockup-assets';

type Row = {
  id: string;
  product_name: string | null;
  technique_name: string | null;
  mockup_url: string | null;
  thumbnail_url: string | null;
  created_at: string;
  deleted_at?: string | null;
};

const row = (over: Partial<Row> = {}): Row => ({
  id: 'm1',
  product_name: 'Caneca',
  technique_name: 'Serigrafia',
  mockup_url: `${BASE}/user-1/mockups/1.png`,
  thumbnail_url: `${BASE}/user-1/mockups/1.png`,
  created_at: '2026-10-01T10:00:00.000Z',
  deleted_at: null,
  ...over,
});

const lastCall = (method: string) => h.calls.filter((c) => c.method === method).pop();
const makeQc = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapper = (qc: QueryClient) => {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
};

beforeEach(() => {
  h.calls.length = 0;
  h.signCalls.length = 0;
  h.tableResult = { data: [], error: null };
  h.signedResult = { data: { signedUrl: 'https://signed.example.com/thumb.png' }, error: null };
  fromMock.mockClear();
  loggerWarn.mockClear();
});

describe('helpers puros', () => {
  it('extractMockupStoragePath: pública, assinada (ignora query) e externa/nula', () => {
    expect(extractMockupStoragePath(`${BASE}/user-1/mockups/a.png`)).toBe('user-1/mockups/a.png');
    expect(
      extractMockupStoragePath(
        'https://proj.supabase.co/storage/v1/object/sign/mockup-assets/user-1/a.png?token=x',
      ),
    ).toBe('user-1/a.png');
    for (const v of ['https://cdn.example.com/a.png', '', null, undefined]) {
      expect(extractMockupStoragePath(v)).toBeNull();
    }
  });

  it('isMockupTrashed: true com deleted_at; false com null/ausente (coluna não aplicada)', () => {
    expect(isMockupTrashed({ deleted_at: '2026-10-02T00:00:00.000Z' })).toBe(true);
    expect(isMockupTrashed({ deleted_at: null })).toBe(false);
    expect(isMockupTrashed({})).toBe(false);
  });

  it('sortMockupsByCreatedAtDesc: decrescente, sem mutar a entrada, inválidas no fim', () => {
    const input = [
      { id: 'velho', created_at: '2026-01-01T00:00:00.000Z' },
      { id: 'novo', created_at: '2026-10-01T00:00:00.000Z' },
      { id: 'ruim', created_at: 'não-é-data' },
    ];
    const copy = [...input];
    expect(sortMockupsByCreatedAtDesc(input).map((r) => r.id)).toEqual(['novo', 'velho', 'ruim']);
    expect(input).toEqual(copy);
  });
});

describe('fetchClientMockups', () => {
  it('consulta por client_id, ordena no banco e devolve caminho + miniatura assinada', async () => {
    h.tableResult = { data: [row()], error: null };
    const result = await fetchClientMockups('crm-42');
    expect(result).toEqual([
      {
        id: 'm1',
        productName: 'Caneca',
        techniqueName: 'Serigrafia',
        createdAt: '2026-10-01T10:00:00.000Z',
        path: 'user-1/mockups/1.png',
        thumbnailUrl: 'https://signed.example.com/thumb.png',
      },
    ]);
    expect(fromMock).toHaveBeenCalledWith('generated_mockups');
    expect(lastCall('eq')).toEqual({ method: 'eq', args: ['client_id', 'crm-42'] });
    expect(lastCall('order')).toEqual({
      method: 'order',
      args: ['created_at', { ascending: false }],
    });
    expect(lastCall('limit')).toEqual({ method: 'limit', args: [DEFAULT_CLIENT_MOCKUPS_LIMIT] });
    expect(h.signCalls).toEqual([
      { path: 'user-1/mockups/1.png', ttl: MOCKUP_THUMBNAIL_TTL_SECONDS },
    ]);
  });

  it('ignora itens na lixeira (deleted_at preenchido)', async () => {
    h.tableResult = {
      data: [row({ id: 'vivo' }), row({ id: 'lixeira', deleted_at: '2026-10-02T00:00:00.000Z' })],
      error: null,
    };
    const result = await fetchClientMockups('crm-42');
    expect(result.map((m) => m.id)).toEqual(['vivo']);
    expect(h.signCalls).toHaveLength(1);
  });

  it('ordena por data decrescente mesmo se o banco devolver fora de ordem', async () => {
    h.tableResult = {
      data: [row({ id: 'antigo', created_at: '2026-01-01T00:00:00.000Z' }), row({ id: 'recente' })],
      error: null,
    };
    expect((await fetchClientMockups('crm-42')).map((m) => m.id)).toEqual(['recente', 'antigo']);
  });

  it('sem client_id devolve [] sem consultar o banco', async () => {
    for (const vazio of [null, undefined, '', '   ']) {
      expect(await fetchClientMockups(vazio)).toEqual([]);
    }
    expect(fromMock).not.toHaveBeenCalled();
    expect(h.signCalls).toHaveLength(0);
  });

  it('mantém o path e cai para a URL pública quando a assinatura falha', async () => {
    h.tableResult = { data: [row()], error: null };
    h.signedResult = { data: null, error: new Error('sign boom') };
    const result = await fetchClientMockups('crm-42');
    expect(result[0].path).toBe('user-1/mockups/1.png');
    expect(result[0].thumbnailUrl).toBe(`${BASE}/user-1/mockups/1.png`);
    expect(loggerWarn).toHaveBeenCalledTimes(1);
  });

  it('URL externa: path null, miniatura = mockup_url, sem createSignedUrl', async () => {
    h.tableResult = {
      data: [
        row({
          mockup_url: 'https://cdn.example.com/x.png',
          thumbnail_url: 'https://cdn.example.com/x.png',
        }),
      ],
      error: null,
    };
    const result = await fetchClientMockups('crm-42');
    expect(result[0].path).toBeNull();
    expect(result[0].thumbnailUrl).toBe('https://cdn.example.com/x.png');
    expect(h.signCalls).toHaveLength(0);
  });

  it('propaga o erro da consulta (não engole falha de rede)', async () => {
    h.tableResult = { data: null, error: new Error('select boom') };
    await expect(fetchClientMockups('crm-42')).rejects.toThrow('select boom');
  });
});

describe('useClientMockups (hook)', () => {
  it('devolve os mockups do cliente com caminho e miniatura assinada', async () => {
    h.tableResult = { data: [row()], error: null };
    const { result } = renderHook(() => useClientMockups('crm-42'), { wrapper: wrapper(makeQc()) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].path).toBe('user-1/mockups/1.png');
    expect(result.current.data?.[0].thumbnailUrl).toBe('https://signed.example.com/thumb.png');
    expect(lastCall('eq')).toEqual({ method: 'eq', args: ['client_id', 'crm-42'] });
  });

  it('sem client_id devolve [] sem erro e sem consultar o banco', async () => {
    const { result } = renderHook(() => useClientMockups(null), { wrapper: wrapper(makeQc()) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });
});
