/**
 * Contrato da leitura de areas de gravacao (2026-11-24).
 *
 * `dbInvoke` resolve `print_area_techniques` para `v_print_area_techniques_public`
 * (GOLD_READ_ALIASES), cuja projecao tem 15 colunas — sem `unit_cost` e sem
 * `production_days`. Pedir coluna fora da projecao responde 400/42703 e a leitura
 * cai para `[]` (medido na REST de producao).
 *
 * O teste trava a lista exata: igualdade estrita, para que coluna nova so entre
 * junto com a alteracao da view.
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
    expect(cols).toEqual([
      'id',
      'product_id',
      'tabela_preco_id',
      'location_code',
      'location_name',
      'location_order',
      'max_width',
      'max_height',
      'is_curved',
      'shape',
      'technique_order',
      'is_active',
      'notes',
      'created_at',
      'updated_at',
    ]);
    // Fora da projecao: 42703 (coluna inexistente) / 42501 (custo sem grant).
    expect(cols).not.toContain('unit_cost');
    expect(cols).not.toContain('production_days');
  });
});
