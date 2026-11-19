/**
 * planFreight.test.ts — a orquestração ponta a ponta do motor.
 */
import { describe, expect, it } from 'vitest';

import { computeItemsHash, planFreight, type PlanOptions } from '../planFreight';
import { CAIXAS_PADRAO, CAIXA_G, CAIXA_M, CAIXA_P, SETTINGS_PADRAO } from './fixtures/boxes';
import { LINHA_BARRA_61, LINHA_CADERNETA, LINHA_SEM_PESO, LINHA_SQUEEZE } from './fixtures/items';

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

    // volume: 3 × 69.984 + 29.403 = 239.355 cm³ = 0,239355 m³ → 0,24
    expect(plan.totals.volumeM3).toBe(0.24);

    // cubado Correios: 3 × 11.664 + 4.900,50 = 39.892,50 g
    expect(plan.totals.cubicWeightG.correios).toBe(39_892.5);

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
    expect(plan.warnings).toHaveLength(1);
    expect(plan.warnings[0]).toContain('Caderneta A5');
    expect(plan.warnings[0]).toContain('2.5');
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
    expect(plan.warnings[0]).toContain('Barra de 61 cm');
    expect(plan.warnings[0]).toContain('GG');
  });

  it('sem caixa ativa cadastrada o aviso diz isso', () => {
    const plan = planFreight([{ row: LINHA_CADERNETA, quantity: 10 }], [], OPCOES, SETTINGS_PADRAO);

    expect(plan.status).toBe('nao_cabe');
    expect(plan.warnings[0]).toContain('nenhuma caixa ativa');
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

  it('avisa quando a caixa fechou no peso e não no espaço', () => {
    // 250 cadernetas na GG = 30.000 g, exatamente o máximo: não cabe mais uma
    const plan = planFreight(
      [{ row: LINHA_CADERNETA, quantity: 250 }],
      CAIXAS_PADRAO,
      OPCOES,
      SETTINGS_PADRAO,
    );

    expect(plan.totals.boxesByCode).toEqual({ GG: 1 });
    expect(plan.warnings).toContain('A caixa GG fechou no peso máximo, não no espaço.');
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
