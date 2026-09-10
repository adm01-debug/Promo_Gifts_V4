import { describe, expect, it, vi } from 'vitest';
import { dbInvoke } from '@/lib/db/postgrest';

vi.mock('@/lib/db/postgrest', () => ({ dbInvoke: vi.fn() }));

const makeProducts = (start: number, count: number) =>
  Array.from({ length: count }, (_, index) => ({ id: `product-${start + index}` }));

describe('fetchAllActiveProducts', () => {
  it('pagina além de 200 resultados com ordenação determinística', async () => {
    const mockedDbInvoke = vi.mocked(dbInvoke);
    mockedDbInvoke
      .mockResolvedValueOnce({ count: 450, records: makeProducts(0, 200) })
      .mockResolvedValueOnce({ count: 200, records: makeProducts(200, 200) })
      .mockResolvedValueOnce({ count: 50, records: makeProducts(400, 50) });

    const { fetchAllActiveProducts } = await import('@/hooks/kit-builder/useKitBuilderQueries');
    const records = await fetchAllActiveProducts('id, name', 'garrafa');

    expect(records).toHaveLength(450);
    expect(mockedDbInvoke).toHaveBeenCalledTimes(3);
    expect(mockedDbInvoke).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        countMode: 'exact',
        limit: 200,
        offset: 0,
        secondaryOrderBy: { ascending: true, column: 'id' },
      }),
    );
    expect(mockedDbInvoke).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ countMode: 'none', offset: 400 }),
    );
  });
});
