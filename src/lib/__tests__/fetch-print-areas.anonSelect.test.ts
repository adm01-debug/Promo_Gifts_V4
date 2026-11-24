/**
 * Regressao (2026-11-24): `print_area_techniques` passou a ter GRANT por COLUNA
 * para `anon` (migration 20261124163000 revoga `unit_cost` do `anon`). Com grant
 * por coluna, o PostgREST expande `select=*` para a tabela inteira e responde
 * 401/42501 para `anon` — medido na REST de producao: antes 200, depois 401.
 *
 * O teste trava o contrato da leitura: colunas explicitas, sem `unit_cost`.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

type DbInvokeArgs = { table?: string; select?: string };

const dbInvoke = vi.fn<(args: DbInvokeArgs) => Promise<unknown>>();

vi.mock('@/lib/db/postgrest', () => ({
  dbInvoke: (args: DbInvokeArgs) => dbInvoke(args),
}));

describe('fetchPrintAreasFromProduct — select explicito para anon', () => {
  beforeEach(() => {
    dbInvoke.mockReset();
    dbInvoke.mockResolvedValue({ records: [], count: 0 });
  });

  it('pede colunas explicitas (sem unit_cost) em print_area_techniques', async () => {
    const { fetchPrintAreasFromProduct } = await import('@/lib/fetch-print-areas');

    await fetchPrintAreasFromProduct('prod-1');

    const call = dbInvoke.mock.calls.find(([opts]) => opts.table === 'print_area_techniques');
    expect(call, 'a leitura de areas de gravacao chamou dbInvoke').toBeTruthy();

    const select = call![0].select;
    expect(select, 'select=* bate no grant por coluna e o anon recebe 401').toBeTruthy();
    expect(select).not.toBe('*');

    const cols = select!.split(',').map((c) => c.trim());
    expect(cols).not.toContain('unit_cost');
    expect(cols).toEqual(
      expect.arrayContaining(['id', 'product_id', 'production_days', 'technique_order']),
    );
  });
});
