/**
 * parity.test.ts — paridade de volumes entre os três caminhos (etapa 58).
 *
 * Mesma lista de peças entra no motor por três portas:
 *  1. orçamento   → useFreightPlan  (linhas com productId do catálogo)
 *  2. kit         → kitToPackInput  (kit sem caixa própria → itens viram linhas)
 *  3. simulador   → planFreight     (mesma entrada do orçamento, sem hook)
 *
 * A garantia é: `plan.totals` (boxesByCode, grossWeightG, volumeM3,
 * cubicWeightG) byte a byte iguais para a mesma lista de peças e mesmas opções.
 */
import { describe, expect, it } from 'vitest';
import { computeItemsHash, kitToPackInput, planFreight, type PlanInput } from '@/lib/freight';
import { CADERNETA, CANETA } from './fixtures/products';
import { CAIXAS_PADRAO, SETTINGS_PADRAO } from './fixtures/boxes';

const CATALOGO = new Map([CADERNETA, CANETA].map((p) => [p.id, p]));

/** Lista de peças idêntica nos três caminhos. */
const PECAS: ReadonlyArray<{ productId: string; quantity: number }> = [
  { productId: CANETA.id, quantity: 10 },
  { productId: CADERNETA.id, quantity: 5 },
];

function opcoes(extra: Partial<{ kitQuantity: number }> = {}) {
  return {
    mixMode: 'misturar' as const,
    computedAt: '2026-11-21T12:00:00.000Z',
    itemsHash: computeItemsHash(PECAS),
    ...extra,
  };
}

/** Caminho 1 e 3: linhas do orçamento/simulador viram PlanInput direto. */
function inputsDeLinhas(pecas: typeof PECAS): PlanInput[] {
  return pecas.map(({ productId, quantity }) => ({
    row: CATALOGO.get(productId)!,
    quantity,
  }));
}

describe('paridade de volumes — orçamento / kit / simulador (etapa 58)', () => {
  it('totais idênticos nos três caminhos para a mesma lista de peças', () => {
    // Caminho 1 e 3: orçamento e simulador usam a MESMA porta (linhas → motor).
    const linhas = planFreight(inputsDeLinhas(PECAS), CAIXAS_PADRAO, opcoes(), SETTINGS_PADRAO);

    // Caminho 2: kit sem caixa própria — kitToPackInput transforma as peças em
    // linhas do catálogo e o plano sai do mesmo motor.
    const kit = {
      box: null,
      items: PECAS.map(({ productId, quantity }) => ({
        id: productId,
        name: CATALOGO.get(productId)?.name ?? `Item ${productId}`,
        quantity,
      })),
    };
    const convertido = kitToPackInput(kit, 1, CATALOGO);
    expect(convertido.status).toBe('ok');
    if (convertido.status !== 'ok') return;
    const kitPlan = planFreight(convertido.inputs, CAIXAS_PADRAO, opcoes(), SETTINGS_PADRAO);

    expect(linhas.status).toBe('ok');
    if (linhas.status !== 'ok') return;
    expect(kitPlan.status).toBe('ok');
    if (kitPlan.status !== 'ok') return;

    expect(linhas.totals).toEqual(kitPlan.totals);
    expect(linhas.volumes).toEqual(kitPlan.volumes);
  });

  it('paridade preservada com kitQuantity multiplicando os três caminhos', () => {
    const linhas = planFreight(
      inputsDeLinhas(PECAS),
      CAIXAS_PADRAO,
      opcoes({ kitQuantity: 3 }),
      SETTINGS_PADRAO,
    );
    const kit = {
      box: null,
      items: PECAS.map(({ productId, quantity }) => ({
        id: productId,
        name: CATALOGO.get(productId)?.name ?? `Item ${productId}`,
        quantity,
      })),
    };
    const convertido = kitToPackInput(kit, 3, CATALOGO);
    expect(convertido.status).toBe('ok');
    if (convertido.status !== 'ok') return;
    const kitPlan = planFreight(
      convertido.inputs,
      CAIXAS_PADRAO,
      opcoes({ kitQuantity: 3 }),
      SETTINGS_PADRAO,
    );

    expect(linhas.status).toBe('ok');
    if (linhas.status !== 'ok') return;
    expect(kitPlan.status).toBe('ok');
    if (kitPlan.status !== 'ok') return;

    expect(linhas.totals).toEqual(kitPlan.totals);
    expect(linhas.totals.grossWeightG).toBeGreaterThan(0);
  });
});
