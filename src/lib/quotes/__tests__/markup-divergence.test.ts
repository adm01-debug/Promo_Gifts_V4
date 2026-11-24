import { describe, it, expect } from 'vitest';
import { applyNegotiationMarkup } from '@/hooks/quotes/quoteMarkup';
import { calculateQuoteTotals, round2 } from '@/hooks/quotes/quoteHelpers';
import type { QuoteItem } from '@/hooks/quotes/quoteTypes';

/**
 * Etapa 103 (ACH-091) — os quatro "totais da cotacao".
 *
 * Caso exato medido no achado: 1,01 unitario x 7 unidades com markup de 13%.
 *
 *   por linha     -> round2(1,01 * 1,13) = 1,14 ; 7 * 1,14 = 7,98
 *   sobre o total -> round2((1,01 * 7) * 1,13) = round2(7,9891) = 7,99
 *
 * O teste afirma que os dois caminhos dao o MESMO numero, porque o cliente ve
 * as linhas no PDF e o total persistido no sistema. Enquanto a etapa 105 nao
 * alinhar o caminho agregado, o caso falha com 7,98 != 7,99 — por isso it.fails.
 * Quando a 104 decidir e a 105 alinhar, troque por it.
 */
const MARKUP = 13;
const UNIT_PRICE = 1.01;
const QUANTITY = 7;

const items: QuoteItem[] = [
  {
    product_id: 'p-ach-091',
    product_name: 'Caneca 1,01 x 7',
    quantity: QUANTITY,
    unit_price: UNIT_PRICE,
  },
];

describe('ACH-091 — markup por linha x markup sobre o agregado (etapa 103)', () => {
  it.fails('a soma das linhas com markup fecha com o subtotal persistido', () => {
    const lineSum = applyNegotiationMarkup(items, MARKUP).reduce(
      (sum, item) => sum + round2(item.unit_price * item.quantity),
      0,
    );

    const { subtotal } = calculateQuoteTotals({ negotiation_markup_percent: MARKUP }, items);

    expect({ somaDasLinhas: lineSum, subtotalPersistido: subtotal }).toEqual({
      somaDasLinhas: subtotal,
      subtotalPersistido: subtotal,
    });
  });
});