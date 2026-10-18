/**
 * Regression guard for the offset-pagination helper.
 *
 * PostgREST truncates every response at `max-rows` (1000 by default), so a
 * listing that silently stops at 1000 rows looks complete but is not.
 * `fetchAllPages` must keep requesting pages until a page comes back short,
 * preserve row order, and surface the first PostgREST error.
 */
import { describe, it, expect, vi } from 'vitest';
import { fetchAllPages } from './fetch-all-pages';

const makePage = (pages: number[][]) => (from: number, to: number) => {
  const size = to - from + 1;
  const page = pages[from / size];
  return Promise.resolve({ data: page ?? [], error: null });
};

describe('fetchAllPages', () => {
  it('concatena páginas até uma página vir curta', () => {
    const fetchPage = makePage([[1, 2], [3]]);
    return expect(fetchAllPages(fetchPage, 2)).resolves.toEqual([1, 2, 3]);
  });

  it('faz uma única requisição quando a primeira página já é curta', async () => {
    const fetchPage = vi.fn(() => Promise.resolve({ data: [{ id: 1 }], error: null }));
    await expect(fetchAllPages(fetchPage, 2)).resolves.toEqual([{ id: 1 }]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith(0, 1);
  });

  it('propaga erro de PostgREST convertido em Error', () => {
    const fetchPage = () =>
      Promise.resolve({ data: null, error: { message: 'RLS denied', code: '42501' } });
    return expect(fetchAllPages(fetchPage, 2)).rejects.toThrow('RLS denied');
  });

  it('preserva instâncias de Error sem reembrulhar', () => {
    const original = new Error('network down');
    const fetchPage = () => Promise.resolve({ data: null, error: original });
    return expect(fetchAllPages(fetchPage, 2)).rejects.toBe(original);
  });

  it('não para em página cheia: continua até receber página vazia', async () => {
    const fetchPage = vi.fn((from: number) =>
      Promise.resolve({ data: from >= 6 ? [] : [from, from + 1], error: null }),
    );
    await expect(fetchAllPages(fetchPage, 2)).resolves.toEqual([0, 1, 2, 3, 4, 5]);
    expect(fetchPage).toHaveBeenCalledTimes(4);
  });
});
