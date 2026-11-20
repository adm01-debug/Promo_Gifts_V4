/**
 * planFreight.test.ts — a orquestração ponta a ponta do motor.
 */
import { describe, expect, it } from 'vitest';

import { computeItemsHash, planFreight, type PlanOptions } from '../planFreight';
import {
  CAIXAS_PADRAO,
  CAIXA_G,
  CAIXA_GG,
  CAIXA_M,
  CAIXA_P,
  SETTINGS_PADRAO,
} from './fixtures/boxes';
import {
  LINHA_BARRA_61,
  LINHA_CADERNETA,
  LINHA_SEM_PESO,
  LINHA_SQUEEZE,
  linhaDeTeste,
} from './fixtures/items';

const OPCOES: PlanOptions = {
  mixMode: 'misturar',
  computedAt: '2026-11-19T12:00:00.000Z',
  itemsHash: 'hash-de-teste',
};

describe('planFreight — status ok', () => {
  it('460 cadernetas sem a GG: 3× G + 1× P, com os totais fechados à mão', () => {
    const plan = planFreight(
      [{ row: LINHA_CADERNETA, quantity: 460 }],
      [CAIXA_P, CAIXA_M, CAIXA_G],
      OPCOES,
      SETTINGS_PADRAO,
    );

    expect(plan.status).toBe('ok');
    expect(plan.totals.boxesByCode).toEqual({ G: 3, P: 1 });

    // peso bruto: 3 × (140 × 120) + 40 × 120 = 50.400 + 4.800 = 55.200 g
    expect(plan.totals.grossWeightG).toBe(55_200);

    // volume: 3 × 69.984 + 29.403 = 239.355 cm³ = 0,239355 m³
    // (6 casas no total, igual ao volume individual: 2 casas zerariam uma
    // encomenda pequena e perderiam 0,0006 m³ só na caixa P)
    expect(plan.totals.volumeM3).toBe(0.239355);

    // cubado Correios: 3 × 11.664 + 4.900,50 = 39.892,50 g
    // cubado rodoviário: G 69.984 ÷ 3.333 × 1.000 = 20.997,30 g; P 29.403 ÷ 3.333
    // × 1.000 = 8.821,78 g → 3 × 20.997,30 + 8.821,78 = 62.991,90 + 8.821,78 =
    // 71.813,68 g
    expect(plan.totals.cubicWeightG).toEqual({ correios: 39_892.5, rodoviario: 71_813.68 });

    expect(plan.volumes).toHaveLength(4);
    expect(plan.missing).toEqual([]);
    expect(plan.mixMode).toBe('misturar');
    expect(plan.computedAt).toBe('2026-11-19T12:00:00.000Z');
    expect(plan.itemsHash).toBe('hash-de-teste');
  });

  it('kitQuantity multiplica a quantidade de cada linha', () => {
    const umKit = planFreight(
      [{ row: LINHA_CADERNETA, quantity: 10 }],
      CAIXAS_PADRAO,
      OPCOES,
      SETTINGS_PADRAO,
    );
    const cinquentaKits = planFreight(
      [{ row: LINHA_CADERNETA, quantity: 10 }],
      CAIXAS_PADRAO,
      { ...OPCOES, kitQuantity: 50 },
      SETTINGS_PADRAO,
    );

    expect(umKit.totals.grossWeightG).toBe(10 * 120);
    // 500 cadernetas: GG cheia (250) → GG cheia (250) → nada resta
    expect(cinquentaKits.totals.grossWeightG).toBe(500 * 120);
    expect(cinquentaKits.totals.boxesByCode).toEqual({ GG: 2 });
  });

  it('linha com quantidade zero sai do plano sem virar erro', () => {
    const plan = planFreight(
      [
        { row: LINHA_CADERNETA, quantity: 10 },
        { row: LINHA_SQUEEZE, quantity: 0 },
      ],
      CAIXAS_PADRAO,
      OPCOES,
      SETTINGS_PADRAO,
    );

    expect(plan.status).toBe('ok');
    expect(plan.volumes).toHaveLength(1);
    expect(plan.volumes[0].items).toEqual([{ productId: 'caderneta', quantity: 10 }]);
  });

  it('separar: o mesmo produto em 3 linhas divide a mesma caixa', () => {
    // 3 linhas de 20 = 60 cadernetas; a P leva 64 → 1× P, não 3× P
    // peso bruto: 60 × 120 = 7.200 g
    // cubado Correios: 27 × 33 × 33 = 29.403 cm³ ÷ 6.000 = 4,9005 kg
    const linha = { row: LINHA_CADERNETA, quantity: 20 };
    const plan = planFreight(
      [linha, linha, linha],
      CAIXAS_PADRAO,
      { ...OPCOES, mixMode: 'separar' },
      SETTINGS_PADRAO,
    );

    expect(plan.status).toBe('ok');
    expect(plan.totals.boxesByCode).toEqual({ P: 1 });
    expect(plan.totals.grossWeightG).toBe(7_200);
    expect(plan.totals.cubicWeightG.correios).toBe(4_900.5);
    expect(plan.volumes[0].items).toEqual([{ productId: 'caderneta', quantity: 60 }]);
    expect(plan.warnings).toEqual([]);
  });

  it('separar: 5 linhas de 20 dão o mesmo plano de 1 linha de 100', () => {
    // 100 cadernetas: P leva 64, M leva 128 → 1× M
    // cubado Correios: 33 × 33 × 47 = 51.183 cm³ ÷ 6.000 = 8,5305 kg
    const opcoes: PlanOptions = { ...OPCOES, mixMode: 'separar' };
    const linha = { row: LINHA_CADERNETA, quantity: 20 };
    const emCinco = planFreight(
      [linha, linha, linha, linha, linha],
      CAIXAS_PADRAO,
      opcoes,
      SETTINGS_PADRAO,
    );
    const emUma = planFreight(
      [{ row: LINHA_CADERNETA, quantity: 100 }],
      CAIXAS_PADRAO,
      opcoes,
      SETTINGS_PADRAO,
    );

    expect(emCinco.totals.boxesByCode).toEqual({ M: 1 });
    expect(emCinco.totals.cubicWeightG.correios).toBe(8_530.5);
    expect(emCinco.volumes).toEqual(emUma.volumes);
    expect(emCinco.totals).toEqual(emUma.totals);
  });

  it('"não mistura": o mesmo produto em 2 linhas não abre 2 caixas', () => {
    // 30 + 30 = 60 cadernetas marcadas como "não mistura": 1× P (leva 64)
    const linha = { row: LINHA_CADERNETA, quantity: 30, shipsSeparately: true };
    const plan = planFreight([linha, linha], CAIXAS_PADRAO, OPCOES, SETTINGS_PADRAO);

    expect(plan.totals.boxesByCode).toEqual({ P: 1 });
    expect(plan.totals.cubicWeightG.correios).toBe(4_900.5);
  });

  it('peça única quase do tamanho da GG vai numa GG', () => {
    // 39 × 49 × 59 cm, 5 kg: entra na GG (39,4 × 49,4 × 59,4) e em nenhuma outra
    // ocupação: 112.749 ÷ 104.052,4056 = 1,0836 — passa de 100% do espaço
    // "aproveitável" porque o fator 0,9 não se aplica a uma peça sozinha
    const row = linhaDeTeste('bau', [39, 49, 59], 5000, 'Baú');
    const uma = planFreight([{ row, quantity: 1 }], CAIXAS_PADRAO, OPCOES, SETTINGS_PADRAO);
    const duas = planFreight([{ row, quantity: 2 }], CAIXAS_PADRAO, OPCOES, SETTINGS_PADRAO);

    expect(uma.status).toBe('ok');
    expect(uma.totals.boxesByCode).toEqual({ GG: 1 });
    expect(uma.volumes[0].fillRatio).toBeCloseTo(112_749 / 104_052.4056, 6);
    expect(duas.totals.boxesByCode).toEqual({ GG: 2 });
  });

  it.each([
    [39, 49, 59],
    [39, 59, 49],
    [49, 39, 59],
    [49, 59, 39],
    [59, 39, 49],
    [59, 49, 39],
  ])('peça cadastrada como %d × %d × %d vai numa GG: o motor gira a peça', (h, w, l) => {
    // só a orientação 39 × 49 × 59 entra na GG (39,4 × 49,4 × 59,4); sem testar
    // as 6 rotações o plano diria "não cabe" conforme a ordem do cadastro
    const row = linhaDeTeste('quase-gg', [h, w, l], 500, 'Quase GG');
    const plan = planFreight([{ row, quantity: 1 }], CAIXAS_PADRAO, OPCOES, SETTINGS_PADRAO);

    expect(plan.status).toBe('ok');
    expect(plan.totals.boxesByCode).toEqual({ GG: 1 });
  });

  it('misturar: 5 cadernetas + 5 squeezes vão na menor caixa que segura tudo', () => {
    // na P: 5/64 + 5/16 = 0,0781 + 0,3125 = 0,3906 ≤ 1 → 1× P
    // peso bruto: 5 × 120 + 5 × 80 = 600 + 400 = 1.000 g
    // volume: 27 × 33 × 33 = 29.403 cm³ = 0,029403 m³
    // cubado: 29.403 ÷ 6.000 × 1.000 = 4.900,50 g · 29.403 ÷ 3.333 × 1.000 = 8.821,78 g
    // (uma GG no lugar da P cubaria 20.000 g: 4,08× o frete)
    const plan = planFreight(
      [
        { row: LINHA_CADERNETA, quantity: 5 },
        { row: LINHA_SQUEEZE, quantity: 5 },
      ],
      CAIXAS_PADRAO,
      OPCOES,
      SETTINGS_PADRAO,
    );

    expect(plan.totals).toEqual({
      boxesByCode: { P: 1 },
      grossWeightG: 1000,
      volumeM3: 0.029403,
      cubicWeightG: { correios: 4900.5, rodoviario: 8821.78 },
    });
  });

  it('misturar: 100 squeezes + 200 cadernetas dão 2× GG + 1× P', () => {
    // GG 1: 70 squeezes (cheia) · GG 2: 30 squeezes + 142 cadernetas ·
    // P: 58 cadernetas — a conta de cada caixa está em packMixed.test.ts
    // peso bruto: 100 × 80 + 200 × 120 = 8.000 + 24.000 = 32.000 g
    // volume: 2 × 120.000 + 29.403 = 269.403 cm³ = 0,269403 m³
    // cubado Correios: 2 × 20.000 + 4.900,50 = 44.900,50 g
    // cubado rodoviário: GG 120.000 ÷ 3.333 × 1.000 = 36.003,60 g →
    //                    2 × 36.003,60 + 8.821,78 = 80.828,98 g
    const plan = planFreight(
      [
        { row: LINHA_SQUEEZE, quantity: 100 },
        { row: LINHA_CADERNETA, quantity: 200 },
      ],
      CAIXAS_PADRAO,
      OPCOES,
      SETTINGS_PADRAO,
    );

    expect(plan.totals).toEqual({
      boxesByCode: { GG: 2, P: 1 },
      grossWeightG: 32_000,
      volumeM3: 0.269403,
      cubicWeightG: { correios: 44_900.5, rodoviario: 80_828.98 },
    });
    expect(plan.volumes.map((v) => v.items)).toEqual([
      [{ productId: 'squeeze', quantity: 70 }],
      [
        { productId: 'squeeze', quantity: 30 },
        { productId: 'caderneta', quantity: 142 },
      ],
      [{ productId: 'caderneta', quantity: 58 }],
    ]);
  });

  it('o plano devolve o modo em que foi calculado', () => {
    const plan = planFreight(
      [{ row: LINHA_CADERNETA, quantity: 10 }],
      CAIXAS_PADRAO,
      { ...OPCOES, mixMode: 'separar' },
      SETTINGS_PADRAO,
    );

    expect(plan.mixMode).toBe('separar');
  });

  it('"não mistura" do cadastro vence o "misturar" do vendedor', () => {
    const misturado = planFreight(
      [
        { row: LINHA_CADERNETA, quantity: 20 },
        { row: LINHA_SQUEEZE, quantity: 10 },
      ],
      CAIXAS_PADRAO,
      OPCOES,
      SETTINGS_PADRAO,
    );
    const comFlag = planFreight(
      [
        { row: LINHA_CADERNETA, quantity: 20 },
        { row: LINHA_SQUEEZE, quantity: 10, shipsSeparately: true },
      ],
      CAIXAS_PADRAO,
      OPCOES,
      SETTINGS_PADRAO,
    );

    // sem a flag os dois dividem uma caixa; com a flag o squeeze ganha a dele
    expect(misturado.volumes).toHaveLength(1);
    expect(comFlag.volumes).toHaveLength(2);
    const conteudos = comFlag.volumes.map((v) => v.items.map((i) => i.productId).join(','));
    expect(conteudos.sort()).toEqual(['caderneta', 'squeeze']);
  });
});

describe('planFreight — status dados_insuficientes', () => {
  it('produto sem peso bloqueia o plano inteiro, sem estimativa parcial', () => {
    const plan = planFreight(
      [
        { row: LINHA_CADERNETA, quantity: 100 },
        { row: LINHA_SEM_PESO, quantity: 5 },
      ],
      CAIXAS_PADRAO,
      OPCOES,
      SETTINGS_PADRAO,
    );

    expect(plan.status).toBe('dados_insuficientes');
    expect(plan.volumes).toEqual([]);
    expect(plan.totals.boxesByCode).toEqual({});
    expect(plan.totals.grossWeightG).toBe(0);
    expect(plan.missing).toEqual([
      { productId: 'sem-peso', name: 'Peça sem peso', missing: ['weight'] },
    ]);
  });

  it('quantidade fracionária bloqueia e o aviso nomeia a linha', () => {
    const plan = planFreight(
      [{ row: LINHA_CADERNETA, quantity: 2.5 }],
      CAIXAS_PADRAO,
      OPCOES,
      SETTINGS_PADRAO,
    );

    expect(plan.status).toBe('dados_insuficientes');
    expect(plan.missing).toEqual([]);
    expect(plan.warnings).toEqual([
      'Quantidade inválida para Caderneta A5: 2.5. Informe um número inteiro maior que zero.',
    ]);
  });

  it('quantidade negativa bloqueia: não vira plano da quantidade positiva', () => {
    const plan = planFreight(
      [{ row: LINHA_CADERNETA, quantity: -5 }],
      CAIXAS_PADRAO,
      OPCOES,
      SETTINGS_PADRAO,
    );

    expect(plan.status).toBe('dados_insuficientes');
    expect(plan.volumes).toEqual([]);
    expect(plan.warnings).toEqual([
      'Quantidade inválida para Caderneta A5: -5. Informe um número inteiro maior que zero.',
    ]);
  });

  it('produto só sem largura aponta a largura, não "não cabe"', () => {
    const row = { ...linhaDeTeste('sem-largura', [10, 10, 10], 100), width_cm: null };
    const plan = planFreight([{ row, quantity: 1 }], CAIXAS_PADRAO, OPCOES, SETTINGS_PADRAO);

    expect(plan.status).toBe('dados_insuficientes');
    expect(plan.missing).toEqual([
      { productId: 'sem-largura', name: 'Peça sem-largura', missing: ['width'] },
    ]);
  });
});

describe('planFreight — o mesmo produto em várias linhas', () => {
  it('missing traz uma entrada por produto, na ordem da primeira ocorrência', () => {
    // 3 linhas do produto sem peso (10, 20 e 30) e 1 do produto sem medida:
    // são 2 cadastros a corrigir, não 4
    const semMedida = linhaDeTeste('sem-medida', null, 100);
    const plan = planFreight(
      [
        { row: LINHA_SEM_PESO, quantity: 10 },
        { row: semMedida, quantity: 1 },
        { row: LINHA_SEM_PESO, quantity: 20 },
        { row: LINHA_SEM_PESO, quantity: 30 },
      ],
      CAIXAS_PADRAO,
      OPCOES,
      SETTINGS_PADRAO,
    );

    expect(plan.status).toBe('dados_insuficientes');
    expect(plan.missing).toEqual([
      { productId: 'sem-peso', name: 'Peça sem peso', missing: ['weight'] },
      { productId: 'sem-medida', name: 'Peça sem-medida', missing: ['height', 'width', 'length'] },
    ]);
  });

  // O mesmo id com 30 × 30 × 30 cm e 2 kg numa linha e 1 × 1 × 1 cm e 1 g na
  // outra. Antes valia a primeira linha: nesta ordem saíam 4 volumes
  // (3× GG + 1× M, 8.000 g) e na ordem invertida 1× P de 4 g. As 4 peças pesam
  // 2 × 2.000 + 2 × 1 = 4.002 g: nenhuma das duas respostas estava certa.
  const grande = { row: linhaDeTeste('dup', [30, 30, 30], 2000), quantity: 2 };
  const pequena = { row: linhaDeTeste('dup', [1, 1, 1], 1), quantity: 2 };
  const AVISO_DUP =
    'Peça dup (SKU-dup) aparece em mais de uma linha com medidas ou peso diferentes. Deixe o produto com uma medida só para calcular o frete.';

  it.each([
    ['grande primeiro', [grande, pequena]],
    ['pequena primeiro', [pequena, grande]],
  ])('medidas diferentes para o mesmo produto bloqueiam (%s)', (_ordem, linhas) => {
    const plan = planFreight(linhas, CAIXAS_PADRAO, OPCOES, SETTINGS_PADRAO);

    expect(plan.status).toBe('dados_insuficientes');
    expect(plan.volumes).toEqual([]);
    expect(plan.totals.grossWeightG).toBe(0);
    expect(plan.missing).toEqual([]);
    expect(plan.warnings).toEqual([AVISO_DUP]);
  });

  it.each([
    ['peso', linhaDeTeste('dup', [30, 30, 30], 2001)],
    ['altura', linhaDeTeste('dup', [31, 30, 30], 2000)],
    ['largura', linhaDeTeste('dup', [30, 31, 30], 2000)],
    ['comprimento', linhaDeTeste('dup', [30, 30, 31], 2000)],
  ])('basta um campo diferente (%s) para bloquear', (_campo, outraLinha) => {
    const plan = planFreight(
      [grande, { row: outraLinha, quantity: 1 }],
      CAIXAS_PADRAO,
      OPCOES,
      SETTINGS_PADRAO,
    );

    expect(plan.status).toBe('dados_insuficientes');
    expect(plan.warnings).toEqual([AVISO_DUP]);
  });

  it('um aviso por produto divergente, mesmo com três linhas dele', () => {
    const plan = planFreight(
      [
        grande,
        { row: LINHA_CADERNETA, quantity: 5 },
        pequena,
        { row: { ...LINHA_CADERNETA, weight_g: 121 }, quantity: 5 },
        pequena,
      ],
      CAIXAS_PADRAO,
      OPCOES,
      SETTINGS_PADRAO,
    );

    expect(plan.status).toBe('dados_insuficientes');
    expect(plan.warnings).toEqual([
      AVISO_DUP,
      'Caderneta A5 (SKU-caderneta) aparece em mais de uma linha com medidas ou peso diferentes. Deixe o produto com uma medida só para calcular o frete.',
    ]);
  });

  it('linha zerada com outra medida não bloqueia: ela saiu do orçamento', () => {
    // sobra só a linha grande: 2 cubos de 30 cm = 1 por caixa → 1× GG + 1× M
    const plan = planFreight(
      [grande, { ...pequena, quantity: 0 }],
      CAIXAS_PADRAO,
      OPCOES,
      SETTINGS_PADRAO,
    );

    expect(plan.status).toBe('ok');
    expect(plan.totals.boxesByCode).toEqual({ GG: 1, M: 1 });
  });
});

describe('planFreight — nada para despachar', () => {
  it('lista vazia não vira plano ok de 0 kg', () => {
    const plan = planFreight([], CAIXAS_PADRAO, OPCOES, SETTINGS_PADRAO);

    expect(plan.status).toBe('dados_insuficientes');
    expect(plan.volumes).toEqual([]);
    expect(plan.missing).toEqual([]);
    expect(plan.warnings).toEqual(['Nenhum item com quantidade para calcular o frete.']);
  });

  it('todas as linhas com quantidade zero é o mesmo que lista vazia', () => {
    const plan = planFreight(
      [
        { row: LINHA_CADERNETA, quantity: 0 },
        { row: LINHA_SEM_PESO, quantity: 0 },
      ],
      CAIXAS_PADRAO,
      OPCOES,
      SETTINGS_PADRAO,
    );

    expect(plan.status).toBe('dados_insuficientes');
    expect(plan.warnings).toEqual(['Nenhum item com quantidade para calcular o frete.']);
  });

  it('planos bloqueados não dividem o mesmo objeto de totais', () => {
    const a = planFreight([], CAIXAS_PADRAO, OPCOES, SETTINGS_PADRAO);
    const b = planFreight([], CAIXAS_PADRAO, OPCOES, SETTINGS_PADRAO);

    expect(a.totals).toEqual(b.totals);
    expect(a.totals).not.toBe(b.totals);
    expect(a.totals.cubicWeightG).not.toBe(b.totals.cubicWeightG);
  });
});

describe('planFreight — status nao_cabe', () => {
  it('peça maior que a maior caixa nomeia a peça e a caixa', () => {
    const plan = planFreight(
      [{ row: LINHA_BARRA_61, quantity: 1 }],
      CAIXAS_PADRAO,
      OPCOES,
      SETTINGS_PADRAO,
    );

    expect(plan.status).toBe('nao_cabe');
    expect(plan.volumes).toEqual([]);
    // a caixa é citada pelo código (GG), não pelo nome ("Caixa GG")
    expect(plan.warnings).toEqual([
      'Barra de 61 cm (SKU-barra-61) não cabe nem na maior caixa ativa (GG).',
    ]);
  });

  it('barra de 61 cm com 15 kg: passa do peso só da P, então a culpa é o tamanho', () => {
    // 15.000 g > 10.000 g (P), mas M (20 kg), G (25 kg) e GG (30 kg) aguentam:
    // o aviso de peso só vale quando NENHUMA caixa aguenta
    const row = linhaDeTeste('barra-15kg', [61, 10, 10], 15_000, 'Barra pesada');
    const plan = planFreight([{ row, quantity: 1 }], CAIXAS_PADRAO, OPCOES, SETTINGS_PADRAO);

    expect(plan.status).toBe('nao_cabe');
    expect(plan.warnings).toEqual([
      'Barra pesada (SKU-barra-15kg) não cabe nem na maior caixa ativa (GG).',
    ]);
  });

  it('o peso da caixa vazia conta no aviso de peso', () => {
    // P de 10 kg que pesa 1 kg vazia: sobram 10.000 − 1.000 = 9.000 g úteis.
    // Um cubo de 9.500 g cabe no espaço e passa do peso útil (9.500 > 9.000).
    const row = linhaDeTeste('denso', [10, 10, 10], 9500, 'Denso');
    const plan = planFreight(
      [{ row, quantity: 1 }],
      [{ ...CAIXA_P, emptyWeightG: 1000 }],
      OPCOES,
      SETTINGS_PADRAO,
    );

    expect(plan.status).toBe('nao_cabe');
    expect(plan.warnings).toEqual([
      'Denso (SKU-denso) pesa mais do que o peso máximo de qualquer caixa ativa.',
    ]);
  });

  it('peso exatamente igual ao máximo da caixa não é "pesa mais"', () => {
    // barra de 61 cm com 10.000 g e só a P (máximo 10.000 g): o peso cabe
    // (10.000 não é maior que 10.000); o que impede é o tamanho
    const row = linhaDeTeste('barra-10kg', [61, 10, 10], 10_000, 'Barra 10 kg');
    const plan = planFreight([{ row, quantity: 1 }], [CAIXA_P], OPCOES, SETTINGS_PADRAO);

    expect(plan.status).toBe('nao_cabe');
    expect(plan.warnings).toEqual([
      'Barra 10 kg (SKU-barra-10kg) não cabe nem na maior caixa ativa (P).',
    ]);
  });

  it('peça pesada demais para qualquer caixa: o aviso culpa o peso, não o tamanho', () => {
    // cubo de 10 cm cabe em todas as caixas, mas 30.001 g passa do máximo da
    // GG (30.000 g), a que mais aguenta
    const row = linhaDeTeste('bigorna', [10, 10, 10], 30_001, 'Bigorna');
    const plan = planFreight([{ row, quantity: 1 }], CAIXAS_PADRAO, OPCOES, SETTINGS_PADRAO);

    expect(plan.status).toBe('nao_cabe');
    expect(plan.warnings).toEqual([
      'Bigorna (SKU-bigorna) pesa mais do que o peso máximo de qualquer caixa ativa.',
    ]);
  });

  it('peça que passa do peso só das caixas menores vai na que aguenta', () => {
    // cubo de 10 cm com 15 kg: P aguenta 10 kg (não), M aguenta 20 kg (sim)
    const row = linhaDeTeste('haltere', [10, 10, 10], 15_000, 'Haltere');
    const plan = planFreight([{ row, quantity: 1 }], CAIXAS_PADRAO, OPCOES, SETTINGS_PADRAO);

    expect(plan.status).toBe('ok');
    expect(plan.totals.boxesByCode).toEqual({ M: 1 });
  });

  it('sem caixa ativa cadastrada o aviso diz isso', () => {
    const plan = planFreight([{ row: LINHA_CADERNETA, quantity: 10 }], [], OPCOES, SETTINGS_PADRAO);

    expect(plan.status).toBe('nao_cabe');
    expect(plan.warnings).toEqual([
      'Caderneta A5 (SKU-caderneta) não cabe: nenhuma caixa ativa cadastrada.',
    ]);
  });
});

describe('planFreight — avisos', () => {
  it('avisa quando uma caixa vai com menos de metade do espaço ocupado', () => {
    // 460 cadernetas em [P, M, G]: a P leva 40 de 64 → 11.760 cm³ sobre
    // 24.942,2976 aproveitáveis = 47,2% < 50%
    const plan = planFreight(
      [{ row: LINHA_CADERNETA, quantity: 460 }],
      [CAIXA_P, CAIXA_M, CAIXA_G],
      OPCOES,
      SETTINGS_PADRAO,
    );

    expect(plan.warnings).toEqual([
      '1 caixa P vai com menos de metade do espaço aproveitável ocupado.',
    ]);
  });

  it('duas caixas ociosas do mesmo código viram um aviso só, no plural', () => {
    // separar: 10 cadernetas → P com 10 × 294 = 2.940 cm³ sobre 24.942,2976 = 11,8%
    //          2 squeezes   → P com 2 × 1.225 = 2.450 cm³ sobre 24.942,2976 = 9,8%
    const plan = planFreight(
      [
        { row: LINHA_CADERNETA, quantity: 10 },
        { row: LINHA_SQUEEZE, quantity: 2 },
      ],
      CAIXAS_PADRAO,
      { ...OPCOES, mixMode: 'separar' },
      SETTINGS_PADRAO,
    );

    expect(plan.totals.boxesByCode).toEqual({ P: 2 });
    expect(plan.warnings).toEqual([
      '2 caixas P vão com menos de metade do espaço aproveitável ocupado.',
    ]);
  });

  it('53% de ocupação não avisa: o limiar é metade', () => {
    // 45 cadernetas na P: 45 × 294 = 13.230 cm³ sobre 24.942,2976 = 53,0%
    // peso: 45 × 120 = 5.400 g; mais uma dá 5.520 ≤ 10.000 → sem aviso de peso
    const plan = planFreight(
      [{ row: LINHA_CADERNETA, quantity: 45 }],
      [CAIXA_P],
      OPCOES,
      SETTINGS_PADRAO,
    );

    expect(plan.warnings).toEqual([]);
  });

  it('exatamente 50% de ocupação não é "menos de metade"', () => {
    // caixa de 10 × 10 × 10 cm por dentro com fator 1: aproveitável 1.000 cm³
    // peça 5 × 10 × 10 = 500 cm³ → 500 ÷ 1.000 = 0,5 exato
    const cubo10 = {
      ...CAIXA_P,
      id: 'fixture-c10',
      code: 'C10',
      inner: { heightCm: 10, widthCm: 10, lengthCm: 10 },
      outer: { heightCm: 11, widthCm: 11, lengthCm: 11 },
      fillFactor: 1,
    };
    const row = linhaDeTeste('meia', [5, 10, 10], 100);
    const plan = planFreight([{ row, quantity: 1 }], [cubo10], OPCOES, SETTINGS_PADRAO);

    expect(plan.status).toBe('ok');
    expect(plan.volumes[0].fillRatio).toBe(0.5);
    expect(plan.warnings).toEqual([]);
  });

  it('volume misturado: se ainda cabe uma da peça mais leve, não fechou no peso', () => {
    // 2 cubos de 3 kg (10 cm) + 30 cubos de 100 g (5 cm) numa P:
    // capacidades na P: pesado ⌊10.000/3.000⌋ = 3 (peso); leve 10.000/100 = 100
    // fração: 2/3 + 30/100 = 0,667 + 0,3 = 0,967 ≤ 1 → 1× P
    // peso bruto: 2 × 3.000 + 30 × 100 = 6.000 + 3.000 = 9.000 g
    // mais uma leve: 9.000 + 100 = 9.100 ≤ 10.000 → cabe, sem aviso de peso
    // (medir pela mais pesada daria 9.000 + 3.000 = 12.000 > 10.000 e avisaria)
    // ocupação: 2 × 1.000 + 30 × 125 = 5.750 cm³ sobre 24.942,2976 = 23,1% → avisa
    const plan = planFreight(
      [
        { row: linhaDeTeste('pesada', [10, 10, 10], 3000), quantity: 2 },
        { row: linhaDeTeste('leve', [5, 5, 5], 100), quantity: 30 },
      ],
      CAIXAS_PADRAO,
      OPCOES,
      SETTINGS_PADRAO,
    );

    expect(plan.totals.boxesByCode).toEqual({ P: 1 });
    expect(plan.totals.grossWeightG).toBe(9000);
    expect(plan.warnings).toEqual([
      '1 caixa P vai com menos de metade do espaço aproveitável ocupado.',
    ]);
  });

  it('249 cadernetas na GG: ainda cabe uma, não avisa teto de peso', () => {
    // bruto 249 × 120 = 29.880 g; mais uma dá 30.000, que não passa de 30.000
    // ocupação: 249 × 294 = 73.206 cm³ sobre 104.052,4056 = 70,4%
    const plan = planFreight(
      [{ row: LINHA_CADERNETA, quantity: 249 }],
      CAIXAS_PADRAO,
      OPCOES,
      SETTINGS_PADRAO,
    );

    expect(plan.totals.boxesByCode).toEqual({ GG: 1 });
    expect(plan.warnings).toEqual([]);
  });

  it('avisa quando a caixa fechou no peso e não no espaço', () => {
    // 250 cadernetas na GG = 30.000 g, exatamente o máximo: não cabe mais uma
    // ocupação: 250 × 294 = 73.500 cm³ sobre 104.052,4056 = 70,6% → só o de peso
    const plan = planFreight(
      [{ row: LINHA_CADERNETA, quantity: 250 }],
      CAIXAS_PADRAO,
      OPCOES,
      SETTINGS_PADRAO,
    );

    expect(plan.totals.boxesByCode).toEqual({ GG: 1 });
    expect(plan.warnings).toEqual(['A caixa GG fechou no peso máximo, não no espaço.']);
  });

  it('caixa com peso próprio não é descontada duas vezes no aviso de peso', () => {
    // GG de 250 g com 245 cadernetas: bruto = 250 + 245 × 120 = 29.650 g.
    // Cabe mais uma caderneta? 29.650 + 120 = 29.770 ≤ 30.000 → cabe, não avisa.
    // Comparar contra (30.000 − 250) daria 29.770 > 29.750 e avisaria teto com
    // 230 g ainda livres.
    // ocupação: 245 × 294 = 72.030 cm³ sobre 104.052,4056 = 69,2% → nenhum aviso
    const ggComPesoProprio = { ...CAIXA_GG, emptyWeightG: 250 };
    const plan = planFreight(
      [{ row: LINHA_CADERNETA, quantity: 245 }],
      [ggComPesoProprio],
      OPCOES,
      SETTINGS_PADRAO,
    );

    expect(plan.status).toBe('ok');
    expect(plan.totals.boxesByCode).toEqual({ GG: 1 });
    expect(plan.totals.grossWeightG).toBe(29_650);
    expect(plan.warnings).toEqual([]);
  });

  it('caixa com peso próprio ainda avisa quando realmente fecha no peso', () => {
    // a mesma GG de 250 g, agora com 248 cadernetas: 250 + 248 × 120 = 30.010 g.
    // O empacotador para em 247 (⌊(30.000 − 250) ÷ 120⌋ = 247): bruto 29.890 g,
    // e mais uma daria 30.010 > 30.000 → avisa.
    const ggComPesoProprio = { ...CAIXA_GG, emptyWeightG: 250 };
    const plan = planFreight(
      [{ row: LINHA_CADERNETA, quantity: 247 }],
      [ggComPesoProprio],
      OPCOES,
      SETTINGS_PADRAO,
    );

    expect(plan.status).toBe('ok');
    expect(plan.totals.grossWeightG).toBe(29_890);
    // ocupação: 247 × 294 = 72.618 cm³ sobre 104.052,4056 = 69,8% → só o de peso
    expect(plan.warnings).toEqual(['A caixa GG fechou no peso máximo, não no espaço.']);
  });

  it('plano confortável não gera aviso', () => {
    const plan = planFreight(
      [{ row: LINHA_CADERNETA, quantity: 60 }],
      [CAIXA_P],
      OPCOES,
      SETTINGS_PADRAO,
    );

    // 60 de 64 na P: 17.640 cm³ sobre 24.942,2976 = 70,7% e 7.200 g de 10.000
    expect(plan.status).toBe('ok');
    expect(plan.warnings).toEqual([]);
  });
});

describe('computeItemsHash', () => {
  it('não depende da ordem da lista', () => {
    const a = computeItemsHash([
      { productId: 'b', quantity: 2 },
      { productId: 'a', quantity: 1 },
    ]);
    const b = computeItemsHash([
      { productId: 'a', quantity: 1 },
      { productId: 'b', quantity: 2 },
    ]);

    expect(a).toBe(b);
  });

  it('muda quando a quantidade muda', () => {
    const antes = computeItemsHash([{ productId: 'a', quantity: 1 }]);
    const depois = computeItemsHash([{ productId: 'a', quantity: 2 }]);

    expect(antes).not.toBe(depois);
  });

  it('muda quando um produto entra', () => {
    const antes = computeItemsHash([{ productId: 'a', quantity: 1 }]);
    const depois = computeItemsHash([
      { productId: 'a', quantity: 1 },
      { productId: 'b', quantity: 1 },
    ]);

    expect(antes).not.toBe(depois);
  });

  it('é estável entre execuções: o mesmo conteúdo dá o mesmo hash', () => {
    expect(computeItemsHash([{ productId: 'caderneta', quantity: 460 }])).toBe(
      computeItemsHash([{ productId: 'caderneta', quantity: 460 }]),
    );
  });

  it('lista vazia tem hash próprio e estável', () => {
    expect(computeItemsHash([])).toBe(computeItemsHash([]));
    expect(computeItemsHash([])).not.toBe(computeItemsHash([{ productId: 'a', quantity: 1 }]));
  });
});
