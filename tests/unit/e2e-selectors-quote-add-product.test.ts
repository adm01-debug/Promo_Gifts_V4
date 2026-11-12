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

  it('e2e/quotes/color-required.spec.ts abre o diálogo pelo seletor real', () => {
    const spec = read('e2e/quotes/color-required.spec.ts');
    expect(spec).toContain('page.locator(Sel.quote.addProductButton)');
    expect(spec).not.toContain("getByTestId('quote-add-product-button')");

    const dialog = /waitForTestIdVisible\(page, '([^']+)'\)/.exec(spec);
    expect(dialog).not.toBeNull();
    expect(read('src/components/quotes/QuoteBuilderProductSearch.tsx')).toContain(
      `data-testid="${dialog![1]}"`,
    );
  });
});

describe('Sel.quote — seletores do fluxo de aprovação de desconto', () => {
  const cases: Array<[keyof typeof Sel.quote, string]> = [
    ['discountInput', 'src/components/quotes/QuoteBuilderSummaryPricing.tsx'],
    ['requestApprovalButton', 'src/components/quotes/QuoteBuilderSummaryColumn.tsx'],
    ['approvalDialog', 'src/components/quotes/QuoteBuilderSummaryDialogs.tsx'],
    ['approvalLimit', 'src/components/quotes/QuoteBuilderSummaryDialogs.tsx'],
    ['approvalRequested', 'src/components/quotes/QuoteBuilderSummaryDialogs.tsx'],
    ['approvalJustification', 'src/components/quotes/QuoteBuilderSummaryDialogs.tsx'],
    ['approvalSubmit', 'src/components/quotes/QuoteBuilderSummaryDialogs.tsx'],
  ];

  it.each(cases)('Sel.quote.%s aponta para data-testid real em %s', (key, file) => {
    const selector = Sel.quote[key];
    expect(typeof selector).toBe('string');
    const match = /^\[data-testid="([^"]+)"\]$/.exec(String(selector));
    expect(match).not.toBeNull();
    expect(read(file)).toContain(`data-testid="${match![1]}"`);
  });
});
