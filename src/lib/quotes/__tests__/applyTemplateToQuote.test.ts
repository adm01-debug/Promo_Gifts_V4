/**
 * Testes — applyTemplateToQuote (RESGATE: "aplicar template ao orçamento")
 *
 * O que estes casos travam, e por quê, está em
 * src/lib/quotes/applyTemplateToQuote.ts (decisões 1 a 5). O mais importante:
 * item de template SEM `productId` não pode entrar no orçamento, porque
 * `QuoteItem.product_id` é obrigatório — e NÃO recebe id inventado.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  applyTemplateToQuote,
  fromTemplateItems,
  type ApplyTemplateTarget,
} from '../applyTemplateToQuote';
import { toTemplateItems } from '@/pages/quotes/components/QuoteBuilderNotesCard';
import type { QuoteTemplate, QuoteTemplateItem } from '@/hooks/quotes/useQuoteTemplates';
import type { QuoteItem } from '@/hooks/quotes/quoteTypes';

function alvo() {
  const t: ApplyTemplateTarget = {
    setItems: vi.fn(),
    setDiscountType: vi.fn(),
    setDiscountValue: vi.fn(),
    setNotes: vi.fn(),
    setPaymentTerms: vi.fn(),
    setDeliveryTime: vi.fn(),
    setValidityDays: vi.fn(),
  };
  return t;
}

function template(over: Partial<QuoteTemplate> = {}): QuoteTemplate {
  return {
    id: 't1',
    seller_id: 'v1',
    name: 'Kit padrão',
    is_default: false,
    template_data: {},
    items: [],
    discount_percent: 0,
    discount_amount: 0,
    validity_days: 30,
    created_at: null,
    updated_at: null,
    ...over,
  } as QuoteTemplate;
}

const itemCompleto: QuoteTemplateItem = {
  productId: 'p1',
  productSku: 'SKU-1',
  productName: 'Caneta',
  quantity: 10,
  unitPrice: 2.5,
  colorName: 'Azul',
  colorHex: '#0000ff',
};

describe('fromTemplateItems — item sem produto vinculado não entra', () => {
  it('descarta item sem productId e NÃO inventa id', () => {
    const itens = fromTemplateItems([
      itemCompleto,
      { productName: 'Sem produto', quantity: 1, unitPrice: 5 },
    ]);
    expect(itens).toHaveLength(1);
    expect(itens[0].product_id).toBe('p1');
    // nada com product_id vazio/placeholder
    expect(itens.every((i) => i.product_id.length > 0)).toBe(true);
  });

  it('productId em branco também não vale', () => {
    expect(fromTemplateItems([{ ...itemCompleto, productId: '   ' }])).toHaveLength(0);
  });

  it('não define price_updated_at: o preço do template não é o do fornecedor', () => {
    const [i] = fromTemplateItems([itemCompleto]);
    expect(i.price_updated_at).toBeUndefined();
    expect(i.price_confirmed_at).toBeUndefined();
  });

  it('calcula subtotal e ordena pelo índice aplicado', () => {
    const itens = fromTemplateItems([
      { productName: 'Sem produto', quantity: 1, unitPrice: 5 },
      itemCompleto,
      { ...itemCompleto, productId: 'p2', productName: 'Caderno', quantity: 3, unitPrice: 7 },
    ]);
    expect(itens.map((i) => i.sort_order)).toEqual([0, 1]);
    expect(itens[0].subtotal).toBe(25);
    expect(itens[1].subtotal).toBe(21);
  });

  it('quantidade e preço inválidos caem em defaults seguros, nunca NaN', () => {
    const [i] = fromTemplateItems([
      { ...itemCompleto, quantity: Number.NaN, unitPrice: Number.NaN },
    ]);
    expect(i.quantity).toBe(1);
    expect(i.unit_price).toBe(0);
    expect(i.subtotal).toBe(0);
  });

  it('personalização sem techniqueId é descartada; com id vira personalizations', () => {
    const [i] = fromTemplateItems([
      {
        ...itemCompleto,
        personalizations: [
          { techniqueId: '', techniqueName: 'Ruim' },
          { techniqueId: 'tec-1', techniqueName: 'Laser', colorsCount: 2, unitCost: 1.5 },
        ],
      },
    ]);
    expect(i.personalizations).toHaveLength(1);
    expect(i.personalizations?.[0]).toMatchObject({
      technique_id: 'tec-1',
      technique_name: 'Laser',
      colors_count: 2,
      unit_cost: 1.5,
    });
    expect(i.has_personalization).toBe(true);
  });

  it('é o inverso de toTemplateItems (ida e volta preserva o essencial)', () => {
    const original: QuoteItem[] = [
      {
        product_id: 'p1',
        product_name: 'Caneta',
        product_sku: 'SKU-1',
        quantity: 10,
        unit_price: 2.5,
        color_name: 'Azul',
        color_hex: '#0000ff',
        personalizations: [{ technique_id: 'tec-1', technique_name: 'Laser', unit_cost: 1.5 }],
      },
    ];
    const volta = fromTemplateItems(toTemplateItems(original));
    expect(volta[0]).toMatchObject({
      product_id: 'p1',
      product_name: 'Caneta',
      product_sku: 'SKU-1',
      quantity: 10,
      unit_price: 2.5,
      color_name: 'Azul',
      color_hex: '#0000ff',
    });
    expect(volta[0].personalizations?.[0].technique_id).toBe('tec-1');
  });
});

describe('applyTemplateToQuote — campos comerciais', () => {
  it('percentual tem precedência sobre valor quando os dois vêm preenchidos', () => {
    const s = alvo();
    applyTemplateToQuote(
      template({ items: [itemCompleto], discount_percent: 7, discount_amount: 99 }),
      s,
    );
    expect(s.setDiscountType).toHaveBeenCalledWith('percent');
    expect(s.setDiscountValue).toHaveBeenCalledWith(7);
    expect(s.setDiscountValue).toHaveBeenCalledTimes(1);
  });

  it('só valor em reais aplica como amount', () => {
    const s = alvo();
    applyTemplateToQuote(template({ discount_percent: 0, discount_amount: 50 }), s);
    expect(s.setDiscountType).toHaveBeenCalledWith('amount');
    expect(s.setDiscountValue).toHaveBeenCalledWith(50);
  });

  it('template sem desconto não toca no desconto da tela', () => {
    const s = alvo();
    applyTemplateToQuote(template({ discount_percent: 0, discount_amount: 0 }), s);
    expect(s.setDiscountType).not.toHaveBeenCalled();
    expect(s.setDiscountValue).not.toHaveBeenCalled();
  });

  it('campo vazio no template NÃO apaga o que o vendedor já escreveu', () => {
    const s = alvo();
    applyTemplateToQuote(
      template({ notes: '   ', payment_terms: '', delivery_time: undefined }),
      s,
    );
    expect(s.setNotes).not.toHaveBeenCalled();
    expect(s.setPaymentTerms).not.toHaveBeenCalled();
    expect(s.setDeliveryTime).not.toHaveBeenCalled();
  });

  it('campos preenchidos são aplicados e relatados', () => {
    const s = alvo();
    const r = applyTemplateToQuote(
      template({
        items: [itemCompleto],
        notes: 'Entrega em 2 lotes',
        payment_terms: '30/60',
        delivery_time: '15 dias',
        validity_days: 45,
        discount_percent: 5,
      }),
      s,
    );
    expect(s.setNotes).toHaveBeenCalledWith('Entrega em 2 lotes');
    expect(s.setPaymentTerms).toHaveBeenCalledWith('30/60');
    expect(s.setDeliveryTime).toHaveBeenCalledWith('15 dias');
    expect(s.setValidityDays).toHaveBeenCalledWith('45');
    expect(r.camposAplicados).toEqual([
      'itens',
      'desconto',
      'observações',
      'condições de pagamento',
      'prazo de entrega',
      'validade',
    ]);
  });

  it('conta os itens ignorados para a tela poder dizer quantos e por quê', () => {
    const s = alvo();
    const r = applyTemplateToQuote(
      template({
        items: [
          itemCompleto,
          { productName: 'A', quantity: 1, unitPrice: 1 },
          { productName: 'B', quantity: 1, unitPrice: 1 },
        ],
      }),
      s,
    );
    expect(r.itensAplicados).toBe(1);
    expect(r.itensIgnorados).toBe(2);
  });

  it('template vazio aplica itens vazios e nada mais', () => {
    const s = alvo();
    const r = applyTemplateToQuote(template({ items: [], validity_days: 0 }), s);
    expect(s.setItems).toHaveBeenCalledWith([]);
    expect(r.itensAplicados).toBe(0);
    expect(r.itensIgnorados).toBe(0);
    expect(r.camposAplicados).toEqual([]);
  });

  it('items não-array no banco não derruba a aplicação', () => {
    const s = alvo();
    const r = applyTemplateToQuote(
      template({ items: undefined as unknown as QuoteTemplateItem[] }),
      s,
    );
    expect(r.itensAplicados).toBe(0);
    expect(s.setItems).toHaveBeenCalledWith([]);
  });
});

// ---------------------------------------------------------------------------
// Etapa 063 — round-trip: template com personalização → applyTemplateToQuote → calculateQuoteTotals
// Prova que total_cost é propagado corretamente pelo fluxo completo.
// ---------------------------------------------------------------------------
import { calculateQuoteTotals } from '@/hooks/quotes/quoteHelpers';

describe('round-trip: personalização de template chega em calculateQuoteTotals (ACH-084)', () => {
  const itemComPersonalizacao: QuoteTemplateItem = {
    productId: 'p-round',
    productSku: 'SKU-RT',
    productName: 'Camiseta',
    quantity: 10,
    unitPrice: 20,
    personalizations: [
      {
        techniqueId: 'tec-seri',
        techniqueName: 'Serigrafia',
        colorsCount: 2,
        unitCost: 1.5, // por peça
        setupCost: 50, // custo fixo de setup
      },
    ],
  };

  it('total calculado por calculateQuoteTotals bate com totalDoTemplate', () => {
    const s = alvo();
    applyTemplateToQuote(template({ items: [itemComPersonalizacao] }), s);

    // Pega os QuoteItems que foram passados para setItems
    const setItemsMock = s.setItems as ReturnType<typeof vi.fn>;
    expect(setItemsMock).toHaveBeenCalledOnce();
    const quoteItems: QuoteItem[] = setItemsMock.mock.calls[0][0];
    expect(quoteItems).toHaveLength(1);

    const { subtotal } = calculateQuoteTotals({}, quoteItems);

    // totalDoTemplate: 10*20 + (1.5*10 + 50) = 200 + 65 = 265
    expect(subtotal).toBe(265);
  });
});
