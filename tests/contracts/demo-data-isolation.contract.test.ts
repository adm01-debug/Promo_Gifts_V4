import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { isDemoMode } from '@/pages/trends/trends-mock';

const originalUrl = window.location.href;
const productMatchPage = readFileSync(
  resolve(process.cwd(), 'src/pages/products/ProductMatchPage.tsx'),
  'utf8',
);

afterEach(() => {
  window.history.replaceState({}, '', originalUrl);
});

describe('contract: isolamento de dados demonstrativos', () => {
  it('ativa Trends demo somente para ?demo=1', () => {
    window.history.replaceState({}, '', '/tendencias');
    expect(isDemoMode()).toBe(false);

    window.history.replaceState({}, '', '/tendencias?demo=0');
    expect(isDemoMode()).toBe(false);

    window.history.replaceState({}, '', '/tendencias?demo=1');
    expect(isDemoMode()).toBe(true);
  });

  it('mantém o fallback de ProductMatch limitado ao build de desenvolvimento', () => {
    expect(productMatchPage).toContain('import.meta.env.DEV ? MOCK_MATCH_PRODUCTS : []');
    expect(productMatchPage).not.toContain('dbProducts.length > 0 ? dbProducts : MOCK_MATCH_PRODUCTS');
  });
});
