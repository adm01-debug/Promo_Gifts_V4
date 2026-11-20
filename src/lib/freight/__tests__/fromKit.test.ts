/**
 * fromKit.test.ts — kit do kit builder → entrada do motor de frete (etapa 51).
 *
 * Medida e peso vêm do catálogo (cm e g, chave = products.id); o kit só diz
 * quais produtos e quantos.
 */
import { describe, expect, it } from 'vitest';

import type { ProductMeasureRow } from '../columns';
import { kitToPackInput } from '../fromKit';
import { planFreight } from '../planFreight';
import { CAIXAS_PADRAO, SETTINGS_PADRAO } from './fixtures/boxes';

const OPCOES_PLANO = {
  mixMode: 'misturar',
  computedAt: '2026-11-20T12:00:00.000Z',
  itemsHash: 'hash-de-teste',
} as const;

/** Linha de catálogo: externa 20 (larg.) × 10 (alt.) × 30 (prof.) cm, 200 g. */
function linha(
  id: string,
  dims: { w: number | null; h: number | null; l: number | null },
  weight: number | null,
  extras: Partial<ProductMeasureRow> = {},
): ProductMeasureRow {
  return {
    id,
    name: `Produto ${id}`,
    sku: `SKU-${id}`,
    height_cm: dims.h,
    width_cm: dims.w,
    length_cm: dims.l,
    diameter_cm: null,
    weight_g: weight,
    ...extras,
  };
}

const CAIXA = linha('caixa-1', { w: 20, h: 10, l: 30 }, 200);
const CADERNETA = linha('caderneta', { w: 14, h: 21, l: 1 }, 120);
const SQUEEZE = linha('squeeze', { w: 7, h: 25, l: 7 }, 80);

function catalogoDe(...linhas: ProductMeasureRow[]) {
  return new Map(linhas.map((l) => [l.id, l]));
}

const linhaKit = (id: string, quantity: number) => ({ id, name: `Item ${id}`, quantity });
const caixaKit = { id: 'caixa-1', name: 'Caixa presente' };

function entradaOk(resultado: ReturnType<typeof kitToPackInput>) {
  if (resultado.status !== 'ok') throw new Error(`status ${resultado.status}`);
  return resultado;
}

function planoDe(resultado: ReturnType<typeof kitToPackInput>) {
  const { inputs, options } = entradaOk(resultado);
  return planFreight(inputs, CAIXAS_PADRAO, { ...OPCOES_PLANO, ...options }, SETTINGS_PADRAO);
}

describe('kitToPackInput — kit com caixa própria', () => {
  const kit = { box: caixaKit, items: [linhaKit('caderneta', 2), linhaKit('squeeze', 3)] };
  const catalogo = catalogoDe(CAIXA, CADERNETA, SQUEEZE);

  it('uma peça = a caixa (id real, medida externa), peso = caixa + itens', () => {
    // peso do kit: 200 (caixa) + 2 × 120 (cadernetas) + 3 × 80 (squeezes) = 200 + 240 + 240 = 680 g
    const { inputs, options, missing } = entradaOk(kitToPackInput(kit, 5, catalogo));

    expect(inputs).toEqual([
      {
        row: {
          id: 'caixa-1',
          name: 'Produto caixa-1',
          sku: 'SKU-caixa-1',
          height_cm: 10,
          width_cm: 20,
          length_cm: 30,
          diameter_cm: null,
          weight_g: 680,
        },
        quantity: 1,
      },
    ]);
    expect(missing).toEqual([]);
    expect(options).toEqual({ kitQuantity: 5, mixMode: 'misturar' });
  });

  it('alimenta planFreight: 5 kits de 680 g pesam 5 × 680 = 3.400 g', () => {
    const plano = planoDe(kitToPackInput(kit, 5, catalogo));
    expect(plano.status).toBe('ok');
    expect(plano.totals.grossWeightG).toBe(3400);
  });

  it('usa a medida EXTERNA da caixa real 94659 (11,5 × 11,5 × 19,5), não a interna', () => {
    // externa 11,5 × 11,5 × 19,5 = 2.578,875 cm³; interna 10,7 × 10,7 × 18,7 = 2.140,963 cm³.
    const real = linha('94659', { w: 11.5, h: 19.5, l: 11.5 }, 48);
    const { inputs } = entradaOk(
      kitToPackInput(
        { box: { id: '94659', name: 'Caixa em cartão' }, items: [] },
        1,
        catalogoDe(real),
      ),
    );
    expect(inputs[0].row).toMatchObject({ height_cm: 19.5, width_cm: 11.5, length_cm: 11.5 });
  });

  it('soma de peso fracionado é arredondada: 0,1 + 0,2 = 0,3 (não 0,30000000000000004)', () => {
    const caixa = linha('caixa-1', { w: 20, h: 10, l: 30 }, 0.1);
    const item = linha('leve', { w: 1, h: 1, l: 1 }, 0.2);
    const { inputs } = entradaOk(
      kitToPackInput({ box: caixaKit, items: [linhaKit('leve', 1)] }, 1, catalogoDe(caixa, item)),
    );
    expect(inputs[0].row.weight_g).toBe(0.3);
  });

  it('linha de quantidade 0 não pesa nem bloqueia, mesmo sem peso nem catálogo', () => {
    // 200 + 0 × (sem peso) + 3 × 80 = 440 g
    const semPeso = linha('sem-peso', { w: 1, h: 1, l: 1 }, null);
    const { inputs } = entradaOk(
      kitToPackInput(
        {
          box: caixaKit,
          items: [linhaKit('sem-peso', 0), linhaKit('fantasma', 0), linhaKit('squeeze', 3)],
        },
        1,
        catalogoDe(CAIXA, SQUEEZE, semPeso),
      ),
    );
    expect(inputs[0].row.weight_g).toBe(440);
  });

  it('caixa sem itens pesa só a caixa', () => {
    const { inputs } = entradaOk(kitToPackInput({ box: caixaKit, items: [] }, 1, catalogo));
    expect(inputs[0].row.weight_g).toBe(200);
  });

  it('item sem peso: missing aponta o ITEM (id e nome reais), não a caixa, e não há input', () => {
    const semPeso = linha('sem-peso', { w: 5, h: 5, l: 5 }, null);
    const r = kitToPackInput(
      { box: caixaKit, items: [linhaKit('caderneta', 2), linhaKit('sem-peso', 1)] },
      1,
      catalogoDe(CAIXA, CADERNETA, semPeso),
    );
    expect(r).toEqual({
      status: 'incomplete',
      inputs: [],
      options: { kitQuantity: 1, mixMode: 'misturar' },
      missing: [{ productId: 'sem-peso', name: 'Produto sem-peso', missing: ['weight'] }],
    });
  });

  it('item sem linha de catálogo dentro da caixa: missing de peso com o id do item', () => {
    const r = kitToPackInput({ box: caixaKit, items: [linhaKit('fantasma', 1)] }, 1, catalogo);
    expect(r).toMatchObject({
      status: 'incomplete',
      missing: [{ productId: 'fantasma', name: 'Item fantasma', missing: ['weight'] }],
    });
  });

  it('caixa sem peso: missing da caixa com o id real dela', () => {
    const r = kitToPackInput(
      { box: caixaKit, items: [linhaKit('caderneta', 1)] },
      1,
      catalogoDe(linha('caixa-1', { w: 20, h: 10, l: 30 }, null), CADERNETA),
    );
    expect(r).toMatchObject({
      status: 'incomplete',
      missing: [{ productId: 'caixa-1', name: 'Produto caixa-1', missing: ['weight'] }],
    });
  });

  it('caixa sem medida externa: missing das medidas da caixa', () => {
    const r = kitToPackInput(
      { box: caixaKit, items: [] },
      1,
      catalogoDe(linha('caixa-1', { w: 20, h: null, l: 0 }, 200)),
    );
    expect(r).toMatchObject({
      status: 'incomplete',
      missing: [{ productId: 'caixa-1', missing: ['height', 'length'] }],
    });
  });

  it('caixa sem linha de catálogo: pendência de tudo, com o id real e nunca sintético', () => {
    const r = kitToPackInput({ box: caixaKit, items: [] }, 1, catalogoDe());
    expect(r).toEqual({
      status: 'incomplete',
      inputs: [],
      options: { kitQuantity: 1, mixMode: 'misturar' },
      missing: [
        {
          productId: 'caixa-1',
          name: 'Caixa presente',
          missing: ['height', 'length', 'weight', 'width'],
        },
      ],
    });
  });

  it('caixa e item sem peso aparecem juntos, caixa primeiro', () => {
    const r = kitToPackInput(
      { box: caixaKit, items: [linhaKit('fantasma', 1)] },
      1,
      catalogoDe(linha('caixa-1', { w: 20, h: 10, l: 30 }, null)),
    );
    expect(r.status === 'incomplete' && r.missing.map((m) => m.productId)).toEqual([
      'caixa-1',
      'fantasma',
    ]);
  });
});

describe('kitToPackInput — kit sem caixa', () => {
  const kit = { box: null, items: [linhaKit('caderneta', 2), linhaKit('squeeze', 3)] };
  const catalogo = catalogoDe(CADERNETA, SQUEEZE);

  it('cada item vira uma linha com a linha de catálogo e mixMode misturar', () => {
    const { inputs, options } = entradaOk(kitToPackInput(kit, 3, catalogo));

    expect(inputs).toEqual([
      { row: CADERNETA, quantity: 2, shipsSeparately: false },
      { row: SQUEEZE, quantity: 3, shipsSeparately: false },
    ]);
    expect(options).toEqual({ kitQuantity: 3, mixMode: 'misturar' });
  });

  it('alimenta planFreight: itens × quantidade × kits', () => {
    // cadernetas: 2 × 3 kits = 6; squeezes: 3 × 3 kits = 9
    // peso bruto: 6 × 120 + 9 × 80 = 720 + 720 = 1.440 g
    const plano = planoDe(kitToPackInput(kit, 3, catalogo));

    expect(plano.status).toBe('ok');
    const porProduto = new Map<string, number>();
    for (const { productId, quantity } of plano.volumes.flatMap((v) => v.items)) {
      porProduto.set(productId, (porProduto.get(productId) ?? 0) + quantity);
    }
    expect(Object.fromEntries(porProduto)).toEqual({ caderneta: 6, squeeze: 9 });
    expect(plano.totals.grossWeightG).toBe(1440);
  });

  it('ships_separately do catálogo vence: "não mistura" sai em volume próprio', () => {
    // caderneta × 5 e garrafa (não mistura) × 5 em 5 kits: 2 grupos → ao menos 2 volumes.
    const garrafa = linha('garrafa', { w: 7, h: 25, l: 7 }, 80, { ships_separately: true });
    const plano = planoDe(
      kitToPackInput(
        { box: null, items: [linhaKit('caderneta', 1), linhaKit('garrafa', 1)] },
        5,
        catalogoDe(CADERNETA, garrafa),
      ),
    );
    const idsPorVolume = plano.volumes.map((v) => v.items.map((i) => i.productId));
    expect(idsPorVolume.some((ids) => ids.includes('garrafa') && ids.includes('caderneta'))).toBe(
      false,
    );
    expect(plano.volumes.length).toBeGreaterThanOrEqual(2);
  });

  it('item sem linha de catálogo vira missing com id e nome do item', () => {
    const r = kitToPackInput(kit, 1, catalogoDe(CADERNETA));
    expect(r).toEqual({
      status: 'incomplete',
      inputs: [],
      options: { kitQuantity: 1, mixMode: 'misturar' },
      missing: [
        {
          productId: 'squeeze',
          name: 'Item squeeze',
          missing: ['height', 'length', 'weight', 'width'],
        },
      ],
    });
  });

  it('item sem medida ou sem peso vira missing do motor e não gera inputs parciais', () => {
    const semLado = linha('squeeze', { w: 0, h: 25, l: 7 }, 80);
    const r = kitToPackInput(kit, 1, catalogoDe(CADERNETA, semLado));
    expect(r).toMatchObject({
      status: 'incomplete',
      inputs: [],
      missing: [{ productId: 'squeeze', name: 'Produto squeeze', missing: ['width'] }],
    });
  });

  it('linha de quantidade 0 é ignorada', () => {
    const { inputs } = entradaOk(
      kitToPackInput(
        { box: null, items: [linhaKit('caderneta', 0), linhaKit('squeeze', 1)] },
        1,
        catalogoDe(SQUEEZE),
      ),
    );
    expect(inputs).toEqual([{ row: SQUEEZE, quantity: 1, shipsSeparately: false }]);
  });

  it('kit vazio vira lista vazia, que o motor bloqueia', () => {
    const r = kitToPackInput({ box: null, items: [] }, 1, catalogoDe());
    expect(entradaOk(r).inputs).toEqual([]);
    expect(planoDe(r).status).toBe('dados_insuficientes');
  });
});

describe('kitToPackInput — erro de entrada devolvido, nunca lançado', () => {
  const kit = { box: null, items: [linhaKit('caderneta', 1)] };
  const catalogo = catalogoDe(CADERNETA);

  it.each([[0], [-1], [1.5], [Number.NaN], [Number.POSITIVE_INFINITY]])(
    'quantidade de kits %p',
    (quantidade) => {
      const r = kitToPackInput(kit, quantidade, catalogo);
      expect(r).toMatchObject({ status: 'error', error: { code: 'invalid_kit_quantity' } });
    },
  );

  it.each([[1.5], [-1]])('quantidade %p de um item', (quantidade) => {
    const r = kitToPackInput(
      { box: null, items: [linhaKit('caderneta', quantidade)] },
      1,
      catalogo,
    );
    expect(r).toEqual({
      status: 'error',
      error: {
        code: 'invalid_item_quantity',
        message: `Quantidade inválida para Item caderneta: ${quantidade}. Informe um número inteiro, zero ou maior.`,
        productId: 'caderneta',
      },
    });
  });
});
