import { describe, expect, it } from 'vitest';
import {
  QUOTE_DEPENDENT_QUERY_KEYS,
  invalidateQuoteCaches,
} from '@/hooks/quotes/quoteCacheInvalidation';
import { QUOTE_VIEWED_MAP_QUERY_KEY } from '@/hooks/quotes/useQuoteViewedMap';
import { SELLER_DISCOUNT_LIMITS_KEY } from '@/hooks/quotes/useSellerDiscountLimits';

const createRecorder = () => {
  const keys: Array<readonly unknown[]> = [];
  return {
    keys,
    client: {
      invalidateQueries: (filters: { queryKey?: readonly unknown[] }) => {
        if (filters.queryKey) keys.push(filters.queryKey);
        return Promise.resolve();
      },
    },
  };
};

describe('invalidateQuoteCaches', () => {
  it('invalida a contagem de itens, os widgets e o limite de desconto junto com a lista', () => {
    const { client, keys } = createRecorder();

    invalidateQuoteCaches(client);

    expect(keys).toEqual([
      ['quotes'],
      ['quote-item-counts'],
      ['my-discount-requests-widget'],
      ['seller-discount-limits'],
    ]);
  });

  it('mantém as chaves iguais às dos módulos donos', () => {
    // `['quotes']` cobre por prefixo o mapa de visualização; se a chave do mapa
    // deixar de começar com 'quotes', ela precisa entrar na lista explicitamente.
    expect(QUOTE_VIEWED_MAP_QUERY_KEY[0]).toBe('quotes');
    expect(QUOTE_DEPENDENT_QUERY_KEYS).toContainEqual([SELLER_DISCOUNT_LIMITS_KEY]);
  });
});
