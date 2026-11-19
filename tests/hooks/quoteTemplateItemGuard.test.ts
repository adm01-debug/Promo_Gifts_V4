/**
 * Resgatado de `salvo/codex-fix-gate1-kit-pdf-types-261109-2252`
 * (`tests/hooks/useQuoteTemplates.legacy.test.ts`), reduzido ao que a main tem
 * hoje: a guarda de ESCRITA. Os casos do original que exercitavam
 * `items_data`/`items_error` na LEITURA ficaram de fora — sinalizar na tela o
 * que já está gravado torto mexe no tipo público e nos consumidores, e está
 * registrado como continuação em `docs/agentes/resgates/`.
 *
 * Cada caso aqui é uma forma real de o `jsonb` chegar torto. Antes desta
 * guarda, todas gravavam.
 */
import { describe, expect, it } from 'vitest';
import {
  isQuoteTemplateItem,
  validateTemplateItems,
} from '@/hooks/quotes/quoteTemplateItemGuard';

const itemValido = {
  productId: 'p1',
  productName: 'Caneca',
  quantity: 2,
  unitPrice: 25,
};

describe('isQuoteTemplateItem', () => {
  it('aceita o item mínimo: nome, quantidade e preço', () => {
    expect(isQuoteTemplateItem({ productName: 'Caneca', quantity: 1, unitPrice: 10 })).toBe(true);
  });

  it.each([
    ['nulo', null],
    ['array no lugar do objeto', []],
    ['string no lugar do objeto', 'caneca'],
    ['sem productName', { quantity: 1, unitPrice: 10 }],
    ['productName numérico', { productName: 7, quantity: 1, unitPrice: 10 }],
    ['sem quantity', { productName: 'Caneca', unitPrice: 10 }],
    ['quantity como string', { productName: 'Caneca', quantity: '2', unitPrice: 10 }],
    ['quantity NaN', { productName: 'Caneca', quantity: Number.NaN, unitPrice: 10 }],
    ['quantity infinita', { productName: 'Caneca', quantity: Infinity, unitPrice: 10 }],
    ['unitPrice como string', { productName: 'Caneca', quantity: 1, unitPrice: '10' }],
    ['unitPrice NaN', { productName: 'Caneca', quantity: 1, unitPrice: Number.NaN }],
  ])('recusa %s', (_rotulo, valor) => {
    expect(isQuoteTemplateItem(valor)).toBe(false);
  });

  it('campo opcional ausente passa; presente com tipo errado recusa', () => {
    expect(isQuoteTemplateItem(itemValido)).toBe(true);
    expect(isQuoteTemplateItem({ ...itemValido, colorHex: 123 })).toBe(false);
    expect(isQuoteTemplateItem({ ...itemValido, colorHex: '#fff' })).toBe(true);
  });

  it('personalizations: ausente passa, malformada recusa', () => {
    expect(isQuoteTemplateItem({ ...itemValido, personalizations: undefined })).toBe(true);
    expect(
      isQuoteTemplateItem({
        ...itemValido,
        personalizations: [{ techniqueId: 't1', techniqueName: 'Serigrafia' }],
      }),
    ).toBe(true);
    // sem techniqueName
    expect(
      isQuoteTemplateItem({ ...itemValido, personalizations: [{ techniqueId: 't1' }] }),
    ).toBe(false);
    // custo não finito: é o que vira NaN no total do orçamento
    expect(
      isQuoteTemplateItem({
        ...itemValido,
        personalizations: [{ techniqueId: 't1', techniqueName: 'Serigrafia', unitCost: '3' }],
      }),
    ).toBe(false);
    // não é array
    expect(isQuoteTemplateItem({ ...itemValido, personalizations: {} })).toBe(false);
  });
});

describe('validateTemplateItems', () => {
  it('lista vazia é válida: template sem item é permitido', () => {
    expect(validateTemplateItems([])).toEqual({ items_data: [], items_error: null });
  });

  it('devolve os itens quando todos passam', () => {
    const r = validateTemplateItems([itemValido, { ...itemValido, productName: 'Boné' }]);
    expect(r.items_error).toBeNull();
    expect(r.items_data).toHaveLength(2);
  });

  it('diz QUAL item reprovou, por posição (1-based)', () => {
    const r = validateTemplateItems([itemValido, { productName: 'Sem preço', quantity: 1 }]);
    expect(r.items_data).toBeNull();
    expect(r.items_error).toBe(
      'O item 2 contém dados incompletos ou inválidos. Os dados originais foram preservados.',
    );
  });

  it('o que não é lista tem mensagem própria', () => {
    for (const valor of [null, undefined, 'itens', 42, {}]) {
      const r = validateTemplateItems(valor);
      expect(r.items_data).toBeNull();
      expect(r.items_error).toBe(
        'Os itens deste template precisam de revisão. Os dados originais foram preservados.',
      );
    }
  });

  it('não muta nem substitui o que recebeu: o original fica intacto', () => {
    const original = [{ ...itemValido }];
    const r = validateTemplateItems(original);
    expect(r.items_data?.[0]).toBe(original[0]);
    expect(original[0]).toEqual(itemValido);
  });
});
