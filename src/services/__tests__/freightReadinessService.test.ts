/**
 * freightReadinessService e productShipsSeparatelyService — o que é enviado ao
 * PostgREST e como as páginas de 1.000 linhas são juntadas.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Result = { data: unknown; error: unknown };
interface Call {
  table: string;
  ops: Array<[string, unknown[]]>;
}

const h = vi.hoisted(() => {
  const calls: Call[] = [];
  const responder: (c: Call) => Result = () => ({ data: [], error: null });
  return { calls, responder };
});

vi.mock('@/integrations/supabase/client', () => {
  function builder(table: string) {
    const call: Call = { table, ops: [] };
    h.calls.push(call);
    const proxy: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'is', 'order', 'range', 'maybeSingle']) {
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

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));

import { PRODUCT_MEASURE_SELECT } from '@/lib/freight';
import {
  FREIGHT_READINESS_SELECT,
  fetchActiveProductsForFreight,
  fetchSupplierNames,
} from '@/services/freightReadinessService';
import { fetchShipsSeparately } from '@/services/productShipsSeparatelyService';

const argsOf = (c: Call, op: string) => c.ops.filter(([m]) => m === op).map(([, a]) => a);
const linhas = (n: number, prefixo: string) =>
  Array.from({ length: n }, (_, i) => ({ id: `${prefixo}${i}` }));

beforeEach(() => {
  h.calls.length = 0;
  h.responder = () => ({ data: [], error: null });
});

describe('FREIGHT_READINESS_SELECT', () => {
  it('é a lista de colunas do motor mais supplier_id', () => {
    expect(FREIGHT_READINESS_SELECT).toBe(`${PRODUCT_MEASURE_SELECT}, supplier_id`);
  });
});

describe('fetchActiveProductsForFreight', () => {
  it('lê páginas de 1.000 até vir página vazia (1.000 + 250 = 1.250 linhas, 3 pedidos)', async () => {
    h.responder = (c) => {
      const [from] = argsOf(c, 'range')[0];
      if (from === 0) return { data: linhas(1000, 'a'), error: null };
      return { data: from === 1000 ? linhas(250, 'b') : [], error: null };
    };
    const todos = await fetchActiveProductsForFreight();
    expect(todos).toHaveLength(1250);
    expect(h.calls.map((c) => argsOf(c, 'range')[0])).toEqual([
      [0, 999],
      [1000, 1999],
      [1250, 2249],
    ]);
  });

  it('com "Max rows" menor que 1.000 (500 por pedido), não toma a página curta como a última', async () => {
    // 1.200 linhas no banco, 500 por pedido: 500 + 500 + 200 = 1.200, pedidos em 0, 500, 1000, 1200.
    h.responder = (c) => {
      const [from] = argsOf(c, 'range')[0];
      const n = typeof from === 'number' ? Math.max(0, Math.min(500, 1200 - from)) : 0;
      return { data: linhas(n, `p${String(from)}-`), error: null };
    };
    const todos = await fetchActiveProductsForFreight();
    expect(todos).toHaveLength(1200);
    expect(h.calls.map((c) => argsOf(c, 'range')[0][0])).toEqual([0, 500, 1000, 1200]);
  });

  it('envia o select da constante FREIGHT_READINESS_SELECT', async () => {
    await fetchActiveProductsForFreight();
    expect(argsOf(h.calls[0], 'select')).toEqual([[FREIGHT_READINESS_SELECT]]);
  });

  it('só pede produtos ativos e não excluídos, ordenados por id', async () => {
    await fetchActiveProductsForFreight();
    const [chamada] = h.calls;
    expect(chamada.table).toBe('products');
    expect(argsOf(chamada, 'eq')).toEqual([['is_active', true]]);
    expect(argsOf(chamada, 'is')).toEqual([['deleted_at', null]]);
    expect(argsOf(chamada, 'order')).toEqual([['id']]);
  });

  it('erro do banco vira mensagem em português', async () => {
    h.responder = () => ({ data: null, error: { code: '42501', message: 'x' } });
    await expect(fetchActiveProductsForFreight()).rejects.toThrow(
      'Não foi possível carregar os produtos.',
    );
  });
});

describe('fetchSupplierNames', () => {
  it('devolve id → nome', async () => {
    h.responder = () => ({ data: [{ id: 's1', name: 'XBZ' }], error: null });
    expect((await fetchSupplierNames()).get('s1')).toBe('XBZ');
  });
});

describe('fetchShipsSeparately', () => {
  it.each([
    { linha: { ships_separately: true }, esperado: true },
    { linha: { ships_separately: false }, esperado: false },
    { linha: null, esperado: false },
  ])('linha $linha → $esperado', async ({ linha, esperado }) => {
    h.responder = () => ({ data: linha, error: null });
    expect(await fetchShipsSeparately('p1')).toBe(esperado);
    expect(argsOf(h.calls[0], 'eq')).toEqual([['id', 'p1']]);
  });

  it('erro do banco é lançado, não vira "false"', async () => {
    h.responder = () => ({ data: null, error: { code: '42703', message: 'sem coluna' } });
    await expect(fetchShipsSeparately('p1')).rejects.toMatchObject({ code: '42703' });
  });
});
