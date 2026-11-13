import { describe, it, expect, vi, beforeEach } from 'vitest';

type Result = { data: unknown; error: unknown };
interface Call {
  table: string;
  ops: Array<[string, unknown[]]>;
}

const h = vi.hoisted(() => ({
  calls: [] as Call[],
  responder: ((_c: Call): Result => ({ data: [], error: null })) as (c: Call) => Result,
}));

vi.mock('@/integrations/supabase/client', () => {
  function builder(table: string) {
    const call: Call = { table, ops: [] };
    h.calls.push(call);
    const proxy: Record<string, unknown> = {};
    for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'order', 'upsert']) {
      proxy[m] = (...args: unknown[]) => {
        call.ops.push([m, args]);
        return proxy;
      };
    }
    proxy.then = (resolve: (r: Result) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(h.responder(call)).then(resolve, reject);
    return proxy;
  }
  return { supabase: { from: (t: string) => builder(t) } };
});

vi.mock('@/lib/security/rls-denial-logger', () => ({
  isRlsDenialError: (e: { code?: string; message?: string } | null) =>
    !!e && (e.code === '42501' || /row-level security/i.test(e.message ?? '')),
}));

import {
  fetchProductMarketing,
  selectMarketingOption,
  unselectMarketingOption,
  MarketingPermissionError,
  PERMISSION_DENIED_MESSAGE,
} from '../productMarketingData';

const has = (c: Call, op: string) => c.ops.some(([m]) => m === op);
const arg = (c: Call, op: string) => c.ops.find(([m]) => m === op)?.[1];

beforeEach(() => {
  h.calls = [];
  h.responder = () => ({ data: [{ id: 'row-1' }], error: null });
});

describe('productMarketingData — leitura', () => {
  it('lê opções dos mestres ativos e vínculos das 3 tabelas, nunca products/v_products_public', async () => {
    h.responder = (c) => {
      if (c.table === 'target_audiences') return { data: [{ id: 'ta1', name: 'MÉDICO' }], error: null };
      if (c.table === 'commemorative_dates') return { data: [{ id: 'cd1', name: 'NATAL' }], error: null };
      if (c.table === 'endomarketing_themes') return { data: [{ id: 'em1', name: 'CIPA | SIPAT' }], error: null };
      if (c.table === 'product_commemorative_dates')
        return {
          data: [{ id: 'l1', commemorative_date_id: 'cd1', source: 'category', is_active: true }],
          error: null,
        };
      return { data: [], error: null };
    };
    const d = await fetchProductMarketing('p1');
    const tables = h.calls.map((c) => c.table).sort();
    expect(tables).toEqual([
      'commemorative_dates',
      'endomarketing_themes',
      'product_commemorative_dates',
      'product_endomarketing',
      'product_target_audiences',
      'target_audiences',
    ]);
    for (const c of h.calls.filter((c) => !c.table.startsWith('product_'))) {
      expect(arg(c, 'eq')).toEqual(['is_active', true]);
      expect(c.ops.filter(([m]) => m === 'order').map(([, a]) => a[0])).toEqual(['display_order', 'name']);
    }
    for (const c of h.calls.filter((c) => c.table.startsWith('product_'))) {
      expect(arg(c, 'eq')).toEqual(['product_id', 'p1']);
    }
    expect(d.publicoAlvo.options).toEqual([{ id: 'ta1', name: 'MÉDICO' }]);
    expect(d.datasComemorativas.links).toEqual([
      { id: 'l1', optionId: 'cd1', source: 'category', isActive: true },
    ]);
    expect(d.endomarketing.loadError).toBeNull();
  });

  it('erro numa categoria (ex.: migration ainda não aplicada) não derruba as outras', async () => {
    h.responder = (c) =>
      c.table === 'endomarketing_themes'
        ? { data: null, error: { code: 'PGRST205', message: 'relation not found' } }
        : { data: [], error: null };
    const d = await fetchProductMarketing('p1');
    expect(d.endomarketing.loadError).toMatch(/carregar opções/);
    expect(d.publicoAlvo.loadError).toBeNull();
  });
});

describe('productMarketingData — escrita', () => {
  it('marcar sem vínculo prévio → INSERT source manual na tabela certa', async () => {
    await selectMarketingOption('p1', 'endomarketing', 'em1', undefined);
    expect(h.calls).toHaveLength(1);
    expect(h.calls[0].table).toBe('product_endomarketing');
    expect(arg(h.calls[0], 'insert')).toEqual([{ product_id: 'p1', theme_id: 'em1', source: 'manual' }]);

    await selectMarketingOption('p1', 'datasComemorativas', 'cd1', undefined);
    expect(h.calls[1].table).toBe('product_commemorative_dates');
    expect(arg(h.calls[1], 'insert')).toEqual([
      { product_id: 'p1', commemorative_date_id: 'cd1', source: 'manual' },
    ]);

    await selectMarketingOption('p1', 'publicoAlvo', 'ta1', undefined);
    expect(arg(h.calls[2], 'insert')).toEqual([
      { product_id: 'p1', target_audience_id: 'ta1', source: 'manual' },
    ]);
  });

  it('marcar vínculo existente desligado → UPDATE is_active=true (não duplica)', async () => {
    await selectMarketingOption('p1', 'datasComemorativas', 'cd1', {
      id: 'l1',
      optionId: 'cd1',
      source: 'category',
      isActive: false,
    });
    expect(h.calls[0].table).toBe('product_commemorative_dates');
    expect(arg(h.calls[0], 'update')).toEqual([{ is_active: true }]);
    expect(arg(h.calls[0], 'eq')).toEqual(['id', 'l1']);
    expect(has(h.calls[0], 'insert')).toBe(false);
  });

  it('desmarcar manual → DELETE', async () => {
    await unselectMarketingOption('publicoAlvo', { id: 'l9', optionId: 'ta1', source: 'manual', isActive: true });
    expect(h.calls[0].table).toBe('product_target_audiences');
    expect(has(h.calls[0], 'delete')).toBe(true);
    expect(arg(h.calls[0], 'eq')).toEqual(['id', 'l9']);
  });

  it('desmarcar herdado da categoria (ou auto) → UPDATE is_active=false, sem DELETE', async () => {
    for (const source of ['category', 'auto', null]) {
      h.calls = [];
      await unselectMarketingOption('datasComemorativas', { id: 'l1', optionId: 'cd1', source, isActive: true });
      expect(has(h.calls[0], 'delete')).toBe(false);
      expect(arg(h.calls[0], 'update')).toEqual([{ is_active: false }]);
    }
  });

  it('erro de RLS vira mensagem clara de permissão', async () => {
    h.responder = () => ({
      data: null,
      error: { code: '42501', message: 'new row violates row-level security policy' },
    });
    await expect(selectMarketingOption('p1', 'endomarketing', 'em1', undefined)).rejects.toThrow(
      PERMISSION_DENIED_MESSAGE,
    );
  });

  it('UPDATE/DELETE filtrado pela RLS (0 linhas, sem erro) também vira erro de permissão', async () => {
    h.responder = () => ({ data: [], error: null });
    await expect(
      unselectMarketingOption('publicoAlvo', { id: 'l9', optionId: 'ta1', source: 'manual', isActive: true }),
    ).rejects.toBeInstanceOf(MarketingPermissionError);
    await expect(
      unselectMarketingOption('datasComemorativas', { id: 'l1', optionId: 'cd1', source: 'category', isActive: true }),
    ).rejects.toBeInstanceOf(MarketingPermissionError);
  });

  it('nenhuma operação toca products, v_products_public ou a coluna tags', async () => {
    await fetchProductMarketing('p1');
    await selectMarketingOption('p1', 'publicoAlvo', 'ta1', undefined);
    await unselectMarketingOption('endomarketing', { id: 'x', optionId: 'em1', source: 'manual', isActive: true });
    for (const c of h.calls) {
      expect(['products', 'v_products_public']).not.toContain(c.table);
      expect(JSON.stringify(c.ops)).not.toMatch(/"tags"/);
    }
  });
});
