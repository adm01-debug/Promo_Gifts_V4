import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/postgrest', () => ({ dbInvoke: vi.fn() }));

import { dbInvoke } from '@/lib/db/postgrest';
import { fetchPromobrindProducts } from '../products';

const mockedDbInvoke = vi.mocked(dbInvoke);

afterEach(() => {
  vi.restoreAllMocks();
  mockedDbInvoke.mockReset();
});

describe('fetchPromobrindProducts — contrato de completude', () => {
  it('falha explicitamente no time budget quando completude é obrigatória', async () => {
    vi.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValue(30_001);
    await expect(fetchPromobrindProducts({ requireComplete: true })).rejects.toThrow(
      'Catálogo incompleto',
    );
  });

  it('mantém compatibilidade best-effort para consumidores legados', async () => {
    vi.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValue(30_001);
    await expect(fetchPromobrindProducts()).resolves.toEqual([]);
  });

  it('nunca entrega parcial quando o request foi abortado', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(fetchPromobrindProducts({ signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('entrega catálogo-base completo acima de 5.000 itens sem enriquecimento pesado', async () => {
    const total = 5_201;
    mockedDbInvoke.mockImplementation((query) => {
      expect(query.table).toBe('products');
      const offset = query.offset ?? 0;
      const limit = query.limit ?? 200;
      const size = Math.max(0, Math.min(limit, total - offset));
      return Promise.resolve({
        records: Array.from({ length: size }, (_, index) => ({
          id: `p-${offset + index}`,
          name: `Produto ${offset + index}`,
          sku: `SKU-${offset + index}`,
          category_name: 'Escritório',
          allows_personalization: true,
        })),
        count: null,
      });
    });

    const products = await fetchPromobrindProducts({
      enrichment: 'base',
      requireComplete: true,
    });

    expect(products).toHaveLength(total);
    expect(products[0]).toMatchObject({
      allows_personalization: true,
      category_name: 'Escritório',
    });
    expect(mockedDbInvoke.mock.calls[0]?.[0].select).toContain('category_name');
    expect(mockedDbInvoke.mock.calls[0]?.[0].select).toContain('allows_personalization');
    expect(mockedDbInvoke.mock.calls.length).toBeGreaterThan(25);
  });
});
