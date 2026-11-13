import { describe, expect, it } from 'vitest';
import { applyFilters, escapeLikePattern, quotePostgrestValue } from '../../../supabase/functions/external-db-bridge/legacy-filters';

/** Query falsa que só grava as chamadas (o builder do supabase-js é encadeável). */
function recorder() {
  const calls: Array<[string, unknown[]]> = [];
  const q: Record<string, (...a: unknown[]) => unknown> = new Proxy({}, {
    get: (_t, method: string) => (...args: unknown[]) => {
      calls.push([method, args]);
      return q;
    },
  });
  return { q, calls };
}

describe('legacy-filters: busca não injeta condições no filtro PostgREST', () => {
  it('escapa %, _ e a própria barra do LIKE', () => {
    expect(escapeLikePattern('50%_off\\x')).toBe('50\\%\\_off\\\\x');
  });

  it('valor do .or() vai entre aspas, com " e \\ escapados', () => {
    expect(quotePostgrestValue('a"b\\c')).toBe('"a\\"b\\\\c"');
  });

  it('vírgula/parênteses/ponto no termo não criam cláusulas novas no .or()', () => {
    const { q, calls } = recorder();
    applyFilters(q as never, { _search: 'x%,id.gt.0,or(price.lt.1)' }, null);
    const [method, [expr]] = calls[0];
    expect(method).toBe('or');
    const clauses = String(expr).split(/,(?=(?:name|sku|supplier_reference|brand|description)\.ilike\.)/);
    expect(clauses).toHaveLength(5); // só as 5 colunas — nada injetado
    for (const c of clauses) expect(c).toMatch(/^[a-z_]+\.ilike\."%x\\\\%,id\.gt\.0,or\(price\.lt\.1\)%"$/);
  });

  it('prefixo de nome usa ilike com o termo escapado', () => {
    const { q, calls } = recorder();
    applyFilters(q as never, { _name_prefix: 'AB_' }, null);
    expect(calls[0]).toEqual(['ilike', ['name', 'AB\\_%']]);
  });
});
