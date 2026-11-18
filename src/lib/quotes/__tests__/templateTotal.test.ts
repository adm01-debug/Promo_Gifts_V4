/**
 * RESGATE do teste `tests/components/QuoteTemplatePreservation.test.tsx`, de
 * outro agente, que vivia só na branch
 * `salvo/codex-fix-gate1-kit-pdf-types-261109-2252`.
 *
 * Aquele arquivo era um teste de componente que mockava
 * `@/hooks/useQuoteTemplates` — caminho que a `main` não tem — e exigia um
 * estado de "template incompleto" que a `main` não modelava. O que ele
 * PROTEGIA, porém, é real: um template cujos itens não podem ser lidos não
 * pode virar `R$ 0,00` nem `R$ NaN` na tela do vendedor. Essa regra passou a
 * morar em `src/lib/quotes/templateTotal.ts` e é o que este teste cobre.
 */
import { describe, expect, it } from 'vitest';
import {
  VALOR_INDISPONIVEL,
  itemTemplateEhCalculavel,
  textoDoSubtotalDoItem,
  textoDoTotal,
  totalDoTemplate,
} from '../templateTotal';
import type { QuoteTemplateItem } from '@/hooks/quotes/useQuoteTemplates';

const moeda = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function item(over: Partial<QuoteTemplateItem> = {}): QuoteTemplateItem {
  return { productName: 'Caneca', quantity: 10, unitPrice: 12.5, ...over };
}

describe('totalDoTemplate', () => {
  it('soma itens, personalização e aplica desconto percentual', () => {
    const total = totalDoTemplate({
      items: [
        item({
          quantity: 10,
          unitPrice: 10,
          personalizations: [
            { techniqueId: 't', techniqueName: 'Serigrafia', unitCost: 1, setupCost: 50 },
          ],
        }),
      ],
      discount_percent: 10,
      discount_amount: 0,
    });
    // 100 (itens) + 10 (1×10) + 50 (setup) = 160; −10% = 144
    expect(total).toBe(144);
  });

  it('aplica desconto em valor quando o percentual é zero', () => {
    expect(
      totalDoTemplate({
        items: [item({ quantity: 2, unitPrice: 50 })],
        discount_percent: 0,
        discount_amount: 25,
      }),
    ).toBe(75);
  });

  it('template sem itens vale zero (e não é "indisponível")', () => {
    expect(totalDoTemplate({ items: [], discount_percent: 0, discount_amount: 0 })).toBe(0);
    expect(textoDoTotal({ items: [] }, moeda)).toBe(moeda(0));
  });

  it('items ausente ou não-array não derruba o cálculo', () => {
    expect(totalDoTemplate({})).toBe(0);
    expect(totalDoTemplate({ items: null })).toBe(0);
  });

  // O coração do resgate: os 3 casos do outro agente.
  it('devolve null — nunca NaN — quando um item não tem quantity', () => {
    const semQuantidade = {
      productName: 'Caneca',
      unitPrice: 12.5,
    } as unknown as QuoteTemplateItem;
    expect(totalDoTemplate({ items: [semQuantidade] })).toBeNull();
  });

  it('devolve null quando um item não tem unitPrice', () => {
    const semPreco = { productName: 'Caneca', quantity: 10 } as unknown as QuoteTemplateItem;
    expect(totalDoTemplate({ items: [semPreco] })).toBeNull();
  });

  it('um item ilegível invalida o total mesmo com outros itens válidos', () => {
    const ilegivel = { productName: 'Boné' } as unknown as QuoteTemplateItem;
    expect(totalDoTemplate({ items: [item(), ilegivel] })).toBeNull();
  });

  it('recusa quantity/unitPrice que não são número finito', () => {
    for (const ruim of [NaN, Infinity, '10' as unknown as number, null as unknown as number]) {
      expect(totalDoTemplate({ items: [item({ quantity: ruim })] })).toBeNull();
      expect(totalDoTemplate({ items: [item({ unitPrice: ruim })] })).toBeNull();
    }
  });

  it('desconto corrompido não contamina o total', () => {
    const t = {
      items: [item({ quantity: 1, unitPrice: 100 })],
      discount_percent: NaN,
      discount_amount: NaN,
    };
    expect(totalDoTemplate(t)).toBe(100);
  });
});

describe('textoDoTotal / textoDoSubtotalDoItem', () => {
  it('a tela mostra "Valor indisponível" — e nunca R$ 0,00 — para itens ilegíveis', () => {
    const ilegivel = { productName: 'Boné' } as unknown as QuoteTemplateItem;
    const texto = textoDoTotal({ items: [ilegivel] }, moeda);
    expect(texto).toBe(VALOR_INDISPONIVEL);
    expect(texto).not.toContain('0,00');
    expect(texto).not.toContain('NaN');
  });

  it('a tela nunca imprime NaN no subtotal de um item', () => {
    const ilegivel = { productName: 'Boné', quantity: 5 } as unknown as QuoteTemplateItem;
    expect(textoDoSubtotalDoItem(ilegivel, moeda)).toBe(VALOR_INDISPONIVEL);
    expect(textoDoSubtotalDoItem(item({ quantity: 2, unitPrice: 10 }), moeda)).toBe(moeda(20));
  });

  it('itemTemplateEhCalculavel separa item usável de item quebrado', () => {
    expect(itemTemplateEhCalculavel(item())).toBe(true);
    expect(itemTemplateEhCalculavel({ productName: 'x' } as unknown as QuoteTemplateItem)).toBe(
      false,
    );
  });
});
