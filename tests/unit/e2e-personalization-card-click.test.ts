import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(resolve(__dirname, '../..', rel), 'utf8');

// O wrapper das ações do card não captura mais cliques (pointer-events-none), então o
// centro do card (cards estreitos no viewport do CI) cai na linha de bolinhas de cor,
// que por contrato não navega (ProductCard: guarda de role="radiogroup"). Os specs
// precisam clicar num alvo que navega: o nome do card.
describe('e2e de personalização abrem a PDP pelo nome do card', () => {
  it.each([
    'e2e/flows/90-personalization-pdp-flow.spec.ts',
    'e2e/flows/91-personalization-variant-flow.spec.ts',
  ])('%s clica em Sel.product.cardName, não no centro do card', (file) => {
    const spec = read(file);
    expect(spec).toContain('await productCard.locator(Sel.product.cardName).click();');
    expect(spec).not.toContain('await productCard.click();');
  });
});
