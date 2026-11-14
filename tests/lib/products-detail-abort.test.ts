/**
 * PDP: o timeout de fetchProductDetail aborta o sinal; ele precisa chegar a TODAS as
 * consultas de fetchPromobrindProductById (principal e enriquecimento), senão cada retry
 * deixa requisições penduradas para trás.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

type Call = { table: string; signal?: AbortSignal };
const calls: Call[] = [];

vi.mock('@/lib/db/postgrest', () => ({
  dbInvoke: vi.fn((opts: Call) => {
    calls.push({ table: opts.table, signal: opts.signal });
    if (opts.table === 'products') {
      return Promise.resolve({
        records: [{ id: 'p-1', name: 'Caneca', supplier_id: 's-1', category_id: 'c-1' }],
        count: 1,
      });
    }
    // Enriquecimento pendurado: só termina se o sinal for abortado.
    return new Promise((_, reject) => {
      opts.signal?.addEventListener(
        'abort',
        () => reject(new DOMException('Aborted', 'AbortError')),
        { once: true },
      );
    });
  }),
}));

import { fetchPromobrindProductById } from '@/lib/external-db/products-detail';

describe('fetchPromobrindProductById — cancelamento', () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it('repassa o sinal às consultas de enriquecimento e elas encerram no abort', async () => {
    const controller = new AbortController();
    const result = fetchPromobrindProductById('p-1', controller.signal);

    await vi.waitFor(() =>
      expect(calls.filter((c) => c.table !== 'products').length).toBeGreaterThan(0),
    );
    const enrichment = calls.filter((c) => c.table !== 'products');
    controller.abort();

    // Sem o sinal nas consultas de enriquecimento, esta promise nunca termina (timeout do teste).
    await result.catch(() => undefined);

    expect(calls.every((c) => c.signal === controller.signal)).toBe(true);
    expect(enrichment.every((c) => c.signal?.aborted)).toBe(true);
  });
});
