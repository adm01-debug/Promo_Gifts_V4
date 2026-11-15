/**
 * Adaptador do histórico da aba do gerador: o teto pedido ao SERVIDOR (.limit) é
 * o teto T8 do serviço (200), o filtro de dono do main continua aplicado e o
 * mapeamento cai para `area_config` em linhas anteriores às migrations.
 *
 * O teto NÃO pode ser menor que isso: busca por nome/SKU, filtros e paginação da
 * aba rodam no cliente sobre esta lista, então um recorte de 10 alcançaria só os
 * 10 últimos mockups.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({
  calls: [] as Array<{ method: string; args: unknown[] }>,
  response: { data: null as unknown, error: null as unknown },
}));

vi.mock('@/integrations/supabase/client', () => {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'order', 'limit', 'eq', 'or', 'range']) {
    builder[method] = (...args: unknown[]) => {
      state.calls.push({ method, args });
      return builder;
    };
  }
  builder.then = (onFulfilled?: (v: unknown) => unknown) =>
    Promise.resolve(state.response).then(onFulfilled);
  return {
    supabase: { from: vi.fn(() => builder) },
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'test-anon-key',
  };
});

const callsOf = (method: string) => state.calls.filter((c) => c.method === method);

describe('mockupHistoryAdapter — fetchRecentMockupHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.calls = [];
    state.response = { data: [], error: null };
  });

  it('pede os 200 do teto T8 ao servidor (teto no servidor, não no cliente)', async () => {
    const { fetchRecentMockupHistory, MOCKUP_HISTORY_PANEL_LIMIT } =
      await import('@/hooks/mockup/mockupHistoryAdapter');

    await fetchRecentMockupHistory('user-1');

    expect(MOCKUP_HISTORY_PANEL_LIMIT).toBe(200);
    expect(callsOf('limit')[0]?.args).toEqual([200]);
    expect(callsOf('order')[0]?.args).toEqual(['created_at', { ascending: false }]);
    // Sem paginação aqui: a aba é atalho, não a página completa.
    expect(callsOf('range')).toHaveLength(0);
  });

  it('mantém o filtro de dono quando há usuário (guarda do main)', async () => {
    const { fetchRecentMockupHistory } = await import('@/hooks/mockup/mockupHistoryAdapter');

    await fetchRecentMockupHistory('user-1');

    expect(callsOf('eq')[0]?.args).toEqual(['user_id', 'user-1']);
  });

  it('sem usuário não inventa filtro (a RLS decide)', async () => {
    const { fetchRecentMockupHistory } = await import('@/hooks/mockup/mockupHistoryAdapter');

    await fetchRecentMockupHistory(undefined);

    expect(callsOf('eq')).toHaveLength(0);
  });

  it('limite inválido cai no padrão em vez de ir sem teto para o servidor', async () => {
    const { fetchRecentMockupHistory } = await import('@/hooks/mockup/mockupHistoryAdapter');

    await fetchRecentMockupHistory('user-1', 0);
    await fetchRecentMockupHistory('user-1', -5);

    expect(callsOf('limit').map((c) => c.args)).toEqual([[200], [200]]);
  });

  it('mapeia a linha para GeneratedMockup, com fallback em area_config', async () => {
    const { fetchRecentMockupHistory } = await import('@/hooks/mockup/mockupHistoryAdapter');
    state.response = {
      data: [
        {
          id: 'm1',
          product_name: 'Caneca',
          product_sku: 'CAN-1',
          technique_name: 'Laser',
          mockup_url: 'https://example.com/m1.png',
          area_name: 'Frente',
          // Linha antiga: geometria e cliente só existem no JSONB.
          area_config: { logoWidth: 7, clientName: 'Cliente A', colorsCount: 2 },
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
      error: null,
    };

    const result = await fetchRecentMockupHistory('user-1');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'm1',
      product_name: 'Caneca',
      logo_width_cm: 7,
      client_name: 'Cliente A',
      colors_count: 2,
      location_name: 'Frente',
    });
  });

  it('propaga o erro do PostgREST em vez de devolver lista vazia', async () => {
    const { fetchRecentMockupHistory } = await import('@/hooks/mockup/mockupHistoryAdapter');
    state.response = { data: null, error: new Error('select boom') };

    await expect(fetchRecentMockupHistory('user-1')).rejects.toThrow('select boom');
  });
});
