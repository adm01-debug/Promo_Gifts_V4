import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { Sel } from '../../e2e/fixtures/selectors';

const read = (rel: string) => readFileSync(resolve(__dirname, '../..', rel), 'utf8');

describe('Sel.quote.addProductButton', () => {
  it('aponta para um data-testid que existe no botão "Produto" do resumo do orçamento', () => {
    const match = /^\[data-testid="([^"]+)"\]$/.exec(Sel.quote.addProductButton);
    expect(match).not.toBeNull();
    const testId = match![1];

    const summary = read('src/components/quotes/QuoteBuilderSummaryColumn.tsx');
    expect(summary).toContain(`data-testid="${testId}"`);
  });

  it('o botão abre o diálogo de busca de produto que o spec espera', () => {
    const page = read('src/pages/quotes/QuoteBuilderPage.tsx');
    expect(page).toContain('onAddProduct={() => s.setProductSearchOpen(true)}');
    expect(read('src/components/quotes/QuoteBuilderProductSearch.tsx')).toContain(
      'data-testid="product-search-input"',
    );
  });
});
