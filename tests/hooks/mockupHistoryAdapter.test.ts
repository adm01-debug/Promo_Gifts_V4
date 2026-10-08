/**
 * Adaptador SSOT do histórico de mockups (as duas telas): teto de 10 itens na aba do
 * gerador, paginação no servidor na página completa, nenhum filtro de dono no cliente
 * (a RLS decide) e uma só função de exclusão.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';

const state = vi.hoisted(() => ({
  calls: [] as Array<{ method: string; args: unknown[] }>,
  response: { data: null as unknown, error: null as unknown, count: null as number | null },
}));

vi.mock('@/integrations/supabase/client', () => {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'order', 'range', 'limit', 'eq', 'or', 'delete']) {
    b[m] = (...args: unknown[]) => {
      state.calls.push({ method: m, args });
      return b;
    };
  }
  b.then = (ok?: (v: unknown) => unknown) => Promise.resolve(state.response).then(ok);
  return {
    supabase: { from: vi.fn(() => b), storage: { from: vi.fn() } },
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'test-anon-key',
  };
});

const service = vi.hoisted(() => ({ deleteMockupFromDb: vi.fn() }));
vi.mock('@/hooks/mockup/mockupGenerationService', () => ({
  deleteMockupFromDb: service.deleteMockupFromDb,
}));

const callsOf = (m: string) => state.calls.filter((c) => c.method === m);

describe('mockupHistoryAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.calls = [];
    state.response = { data: [], error: null, count: 0 };
  });

  it('a aba do gerador pede no máximo 10 itens ao servidor (teto no servidor)', async () => {
    const { fetchRecentMockupHistory, MOCKUP_HISTORY_PANEL_LIMIT } = await import(
      '@/hooks/mockup/mockupHistoryAdapter'
    );

    await fetchRecentMockupHistory();

    expect(MOCKUP_HISTORY_PANEL_LIMIT).toBe(10);
    expect(callsOf('limit')[0]?.args).toEqual([10]);
    expect(callsOf('range')).toHaveLength(0);
  });

  it('a página completa pagina no servidor e sanitiza a busca do or(...)', async () => {
    const { fetchMockupHistoryPage, MOCKUP_HISTORY_PAGE_SIZE } = await import(
      '@/hooks/mockup/mockupHistoryAdapter'
    );
    state.response = { data: [], error: null, count: 42 };

    const result = await fetchMockupHistoryPage({ page: 2, search: 'caneca, (azul) %*' });

    expect(MOCKUP_HISTORY_PAGE_SIZE).toBe(20);
    expect(callsOf('range')[0]?.args).toEqual([20, 39]);
    expect(callsOf('select')[0]?.args[1]).toEqual({ count: 'exact' });
    expect(callsOf('or')[0]?.args[0]).toContain('product_name.ilike.%caneca azul%');
    expect(callsOf('or')[0]?.args[0]).not.toMatch(/[()*]/);
    expect(result).toEqual({ mockups: [], totalCount: 42 });
  });

  it('nenhum pedido filtra por dono no cliente (a RLS decide)', async () => {
    const { fetchRecentMockupHistory, fetchMockupHistoryPage } = await import(
      '@/hooks/mockup/mockupHistoryAdapter'
    );

    await fetchRecentMockupHistory();
    await fetchMockupHistoryPage({ page: 1 });

    expect(callsOf('eq')).toHaveLength(0);
    expect(state.calls.flatMap((c) => c.args)).not.toContain('user_id');
  });

  it('as duas telas de histórico usam este adaptador (SSOT do mapeamento e da exclusão)', () => {
    const page = readFileSync('src/pages/mockups/MockupHistoryPage.tsx', 'utf8');
    expect(page).toContain('fetchMockupHistoryPage');
    expect(page).toContain('deleteMockupHistoryItem');
    expect(page).not.toContain('integrations/supabase/client');
    expect(readFileSync('src/hooks/mockup/useMockupGenerator.ts', 'utf8')).toContain(
      'fetchRecentMockupHistory',
    );
  });

  it('exclusão delega para deleteMockupFromDb (mesma função das duas telas)', async () => {
    const { deleteMockupHistoryItem } = await import('@/hooks/mockup/mockupHistoryAdapter');

    await deleteMockupHistoryItem('m1');

    expect(service.deleteMockupFromDb).toHaveBeenCalledWith('m1');
  });
});
