import { describe, it, expect } from 'vitest';
import { calculateTotalKitPrice } from '../price-calculator';
import type { KitBox, KitItem, KitPersonalization } from '../types';

/**
 * Etapa 113 (ACH-092) - duas definicoes de subtotal no caminho kit -> cotacao.
 *
 * A conversao em cotacao (src/pages/kit-builder/useKitBuilderQuote.ts:210-232)
 * grava `pricing.subtotal` em `quotes.subtotal` e manda o custo de
 * personalizacao em `quote_items.personalization_cost`.
 *
 * O banco regrava o subtotal incluindo a personalizacao
 * (`fn_quotes_recalc_subtotal_from_items`, SCHEMA_LIVE.sql:38853-38912:
 * `SUM(quantity * unit_price + COALESCE(personalization_cost, 0))`). O numero
 * que o vendedor ve ao montar o kit PRECISA ser o numero que fica salvo.
 *
 * Antes da etapa 114 este caso falhava por 20,00 (o kit mostrava so caixa +
 * itens). A etapa 114 alinhou `calculateTotalKitPrice` ao banco: `subtotal`
 * inclui a personalizacao e `productsPrice` guarda caixa + itens. Este teste
 * virou verificacao de regressao.
 */
const KIT_QUANTITY = 10;

const box: KitBox = {
  id: 'box-ach-092',
  name: 'Caixa kraft',
  sku: 'CX-001',
  imageUrl: null,
  price: 3,
  internalWidth: 20,
  internalHeight: 10,
  internalDepth: 15,
  internalVolume: 3000,
};

const items: KitItem[] = [
  {
    id: 'item-ach-092',
    name: 'Caneca',
    sku: 'CN-001',
    imageUrl: null,
    price: 8,
    width: 8,
    height: 9,
    depth: 8,
    volume: 576,
    quantity: 2,
  },
];

const personalization: KitPersonalization = {
  box: { enabled: true, estimatedPrice: 2, totalPrice: 20, pricedQuantity: KIT_QUANTITY },
  items: {},
};

describe('ACH-092 - subtotal do kit x subtotal persistido (etapa 113)', () => {
  it('o subtotal exibido pelo kit e igual ao subtotal que o banco grava', () => {
    const pricing = calculateTotalKitPrice(box, items, personalization, KIT_QUANTITY);

    // O que o banco grava: SUM(quantity * unit_price + personalization_cost).
    const boxLine = box.price * KIT_QUANTITY;
    const itemLine = items[0].price * items[0].quantity * KIT_QUANTITY;
    const persistedSubtotal = boxLine + itemLine + pricing.personalizationPrice;

    expect({ subtotalDoKit: pricing.subtotal, subtotalPersistido: persistedSubtotal }).toEqual({
      subtotalDoKit: persistedSubtotal,
      subtotalPersistido: persistedSubtotal,
    });
  });

  it('mantem caixa + itens em productsPrice, separado da personalizacao', () => {
    const pricing = calculateTotalKitPrice(box, items, personalization, KIT_QUANTITY);

    expect(pricing.productsPrice).toBe(190);
    expect(pricing.personalizationPrice).toBe(20);
    expect(pricing.subtotal).toBe(210);
    expect(pricing.total).toBe(210);
  });
});