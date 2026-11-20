/**
 * planFreight.robustez.test.ts — o plano sempre responde.
 *
 * Três promessas, cada uma com o caso que a quebrava antes:
 *
 * 1. caixa ou parâmetro inválido bloqueia o plano (antes: peso cubado 0 com
 *    status `ok`);
 * 2. quantidade absurda bloqueia pelo teto de volumes, sem exceção e sem
 *    travar (antes: `RangeError` na casa de 125 mil volumes e estouro de
 *    memória com `Number.MAX_SAFE_INTEGER`);
 * 3. a resposta vem em milissegundos qualquer que seja a quantidade.
 */
import { describe, expect, it } from 'vitest';

import { MAX_VOLUMES_POR_PLANO } from '../limits';
import { planFreight, type PlanOptions } from '../planFreight';
import type { FreightSettings } from '../types';
import { CAIXAS_PADRAO, CAIXA_GG, CAIXA_M, CAIXA_P, SETTINGS_PADRAO } from './fixtures/boxes';
import { LINHA_CADERNETA, LINHA_SQUEEZE, linhaDeTeste } from './fixtures/items';

const OPCOES: PlanOptions = {
  mixMode: 'misturar',
  computedAt: '2026-11-20T12:00:00.000Z',
  itemsHash: 'hash-de-teste',
};
const SEPARAR: PlanOptions = { ...OPCOES, mixMode: 'separar' };

const TOTAIS_VAZIOS = {
  boxesByCode: {},
  grossWeightG: 0,
  volumeM3: 0,
  cubicWeightG: { correios: 0, rodoviario: 0 },
};

/**
 * Cubo de 30 cm, 2 kg: vai **1 por caixa** na M, na G e na GG e não entra na P.
 *
 * | Caixa | Interna (cm) | Grade |
 * |---|---|---|
 * | P | 26,4 × 32,4 × 32,4 | ⌊26,4/30⌋ = 0 → não entra |
 * | M | 32,4 × 32,4 × 46,4 | 1 · 1 · ⌊46,4/30⌋ = 1 |
 * | G | 35,4 × 35,4 × 53,4 | 1 · 1 · ⌊53,4/30⌋ = 1 |
 * | GG | 39,4 × 49,4 × 59,4 | 1 · ⌊49,4/30⌋ · ⌊59,4/30⌋ = 1 · 1 · 1 = 1 |
 *
 * Então N cubos são N volumes: N − 1 na GG (a maior, cheia com 1) e o último
 * na M (a menor caixa que fecha o que falta).
 */
const cubo30 = (id = 'cubo') => linhaDeTeste(id, [30, 30, 30], 2000, 'Cubo de 30 cm');

/** O valor como chega de fora (JSON), sem a promessa do tipo declarado. */
const lixo = (valor: unknown): never => JSON.parse(JSON.stringify(valor ?? null));

const avisoDoTeto = (caixas: string) =>
  `O pedido daria ${caixas} caixas, acima do limite de 10.000 caixas por plano. Confira a quantidade de cada item.`;

describe('planFreight — falha fechada: caixa ou parâmetro inválido bloqueia', () => {
  it('controle: 3 cubos de 30 cm dão 2× GG + 1× M, com cubado maior que zero', () => {
    // peso bruto: 3 × 2.000 = 6.000 g
    // volume: 2 × 120.000 + 51.183 (M: 33 × 33 × 47) = 291.183 cm³ = 0,291183 m³
    // cubado Correios: 2 × 20.000 + 51.183 ÷ 6.000 × 1.000 (8.530,50) = 48.530,50 g
    // cubado rodoviário: GG 120.000 ÷ 3.333 × 1.000 = 36.003,60; M 51.183 ÷ 3.333
    //                    × 1.000 = 15.356,44 → 2 × 36.003,60 + 15.356,44 = 87.363,64 g
    const plan = planFreight(
      [{ row: cubo30(), quantity: 3 }],
      CAIXAS_PADRAO,
      OPCOES,
      SETTINGS_PADRAO,
    );

    expect(plan.status).toBe('ok');
    expect(plan.totals).toEqual({
      boxesByCode: { GG: 2, M: 1 },
      grossWeightG: 6000,
      volumeM3: 0.291183,
      cubicWeightG: { correios: 48_530.5, rodoviario: 87_363.64 },
    });
  });

  it('linha crua de freight_settings (snake_case) não vira cubado 0 com status ok', () => {
    // Como a linha chega do banco quando o adaptador não traduz os nomes: o
    // tipo declarado é FreightSettings, o conteúdo não. Antes, os mesmos 3
    // cubos saíam `ok`, 2× GG + 1× M, com cubado { correios: 0, rodoviario: 0 }.
    const linhaDoBanco: FreightSettings = JSON.parse(
      '{"cubic_divisor_correios":6000,"cubic_divisor_rodoviario":3333,"default_fill_factor":0.9}',
    );
    const plan = planFreight([{ row: cubo30(), quantity: 3 }], CAIXAS_PADRAO, OPCOES, linhaDoBanco);

    expect(plan).toEqual({
      ...OPCOES,
      status: 'dados_insuficientes',
      volumes: [],
      totals: TOTAIS_VAZIOS,
      warnings: [
        'Parâmetro de frete inválido: o divisor do peso cubado dos Correios (cubicDivisorCorreios) precisa ser um número maior que zero. Recebido: campo ausente.',
        'Parâmetro de frete inválido: o divisor do peso cubado rodoviário (cubicDivisorRodoviario) precisa ser um número maior que zero. Recebido: campo ausente.',
        'Parâmetro de frete inválido: o fator de aproveitamento padrão (defaultFillFactor) precisa ser um número maior que zero e no máximo 1. Recebido: campo ausente.',
      ],
      missing: [],
    });
  });

  it.each([0, -6000, Number.NaN])('divisor dos Correios %d bloqueia o plano', (divisor) => {
    const plan = planFreight([{ row: cubo30(), quantity: 3 }], CAIXAS_PADRAO, OPCOES, {
      ...SETTINGS_PADRAO,
      cubicDivisorCorreios: divisor,
    });

    expect(plan.status).toBe('dados_insuficientes');
    expect(plan.volumes).toEqual([]);
    expect(plan.totals).toEqual(TOTAIS_VAZIOS);
    expect(plan.warnings).toEqual([
      `Parâmetro de frete inválido: o divisor do peso cubado dos Correios (cubicDivisorCorreios) precisa ser um número maior que zero. Recebido: ${divisor}.`,
    ]);
  });

  it('fator padrão zerado bloqueia: não vira "10 caixas onde cabia uma"', () => {
    const plan = planFreight([{ row: LINHA_CADERNETA, quantity: 10 }], CAIXAS_PADRAO, OPCOES, {
      ...SETTINGS_PADRAO,
      defaultFillFactor: 0,
    });

    expect(plan.status).toBe('dados_insuficientes');
    expect(plan.warnings).toEqual([
      'Parâmetro de frete inválido: o fator de aproveitamento padrão (defaultFillFactor) precisa ser um número maior que zero e no máximo 1. Recebido: 0.',
    ]);
  });

  it('uma caixa inválida bloqueia o plano inteiro, mesmo com outras válidas', () => {
    // 10 cadernetas cabem na P (64), que está certa; a GG com peso máximo 0 é a
    // que está errada. Ignorá-la em silêncio mudaria o plano sem ninguém saber.
    const plan = planFreight(
      [{ row: LINHA_CADERNETA, quantity: 10 }],
      [CAIXA_P, CAIXA_M, { ...CAIXA_GG, maxWeightG: 0 }],
      OPCOES,
      SETTINGS_PADRAO,
    );

    expect(plan.status).toBe('dados_insuficientes');
    expect(plan.volumes).toEqual([]);
    expect(plan.totals).toEqual(TOTAIS_VAZIOS);
    expect(plan.warnings).toEqual([
      'Caixa GG inválida: o peso máximo (maxWeightG) precisa ser um número maior que zero. Recebido: 0.',
    ]);
  });

  it('a configuração é conferida antes dos itens: lista vazia com caixa inválida', () => {
    const plan = planFreight([], [{ ...CAIXA_P, emptyWeightG: -500 }], OPCOES, SETTINGS_PADRAO);

    expect(plan.warnings).toEqual([
      'Caixa P inválida: o peso da caixa vazia (emptyWeightG) precisa ser um número maior ou igual a zero. Recebido: -500.',
    ]);
  });
});

describe('planFreight — teto de volumes por plano', () => {
  it('o teto é 10.000 volumes', () => {
    expect(MAX_VOLUMES_POR_PLANO).toBe(10_000);
  });

  it('10.000 volumes (o teto exato) ainda saem', () => {
    // 9.999 na GG + 1 na M (ver cubo30)
    // peso bruto: 10.000 × 2.000 = 20.000.000 g
    // volume: 9.999 × 120.000 + 51.183 = 1.199.931.183 cm³ = 1.199,931183 m³
    // cubado Correios: 9.999 × 20.000 + 8.530,50 = 199.988.530,50 g
    const plan = planFreight(
      [{ row: cubo30(), quantity: 10_000 }],
      CAIXAS_PADRAO,
      SEPARAR,
      SETTINGS_PADRAO,
    );

    expect(plan.status).toBe('ok');
    expect(plan.volumes).toHaveLength(10_000);
    expect(plan.totals.boxesByCode).toEqual({ GG: 9999, M: 1 });
    expect(plan.totals.grossWeightG).toBe(20_000_000);
    expect(plan.totals.volumeM3).toBe(1199.931183);
    expect(plan.totals.cubicWeightG.correios).toBe(199_988_530.5);
  });

  it('10.001 volumes bloqueiam: o aviso cita a contagem e nenhum volume é montado', () => {
    const plan = planFreight(
      [{ row: cubo30(), quantity: 10_001 }],
      CAIXAS_PADRAO,
      SEPARAR,
      SETTINGS_PADRAO,
    );

    expect(plan).toEqual({
      ...SEPARAR,
      status: 'dados_insuficientes',
      volumes: [],
      totals: TOTAIS_VAZIOS,
      warnings: [avisoDoTeto('10.001')],
      missing: [],
    });
  });

  it('125.148 volumes: o pedido que estourava a pilha agora só bloqueia', () => {
    // era `rascunhos.push(...volumes)` com 125.148 argumentos → RangeError
    const plan = planFreight(
      [{ row: cubo30(), quantity: 125_148 }],
      CAIXAS_PADRAO,
      SEPARAR,
      SETTINGS_PADRAO,
    );

    expect(plan.status).toBe('dados_insuficientes');
    expect(plan.warnings).toEqual([avisoDoTeto('125.148')]);
  });

  it('o teto vale para a soma dos grupos: 5.000 + 5.000 passa, 5.000 + 5.001 não', () => {
    // separar: cada produto é um grupo, e cada cubo é um volume
    const noTeto = planFreight(
      [
        { row: cubo30('cubo-a'), quantity: 5000 },
        { row: cubo30('cubo-b'), quantity: 5000 },
      ],
      CAIXAS_PADRAO,
      SEPARAR,
      SETTINGS_PADRAO,
    );
    expect(noTeto.status).toBe('ok');
    // por grupo: 4.999 na GG + 1 na M → 2 × 4.999 = 9.998 GG e 2 M
    expect(noTeto.totals.boxesByCode).toEqual({ GG: 9998, M: 2 });

    const acima = planFreight(
      [
        { row: cubo30('cubo-a'), quantity: 5000 },
        { row: cubo30('cubo-b'), quantity: 5001 },
      ],
      CAIXAS_PADRAO,
      SEPARAR,
      SETTINGS_PADRAO,
    );
    expect(acima.status).toBe('dados_insuficientes');
    expect(acima.volumes).toEqual([]);
    expect(acima.warnings).toEqual([avisoDoTeto('10.001')]);
  });

  it('depois de passar do teto, os grupos seguintes só contam: o aviso traz o total', () => {
    // 6.000 + 6.000 + 3 = 12.003 volumes; o segundo grupo já passa do teto e o
    // terceiro ainda entra na conta
    const plan = planFreight(
      [
        { row: cubo30('cubo-a'), quantity: 6000 },
        { row: cubo30('cubo-b'), quantity: 6000 },
        { row: cubo30('cubo-c'), quantity: 3 },
      ],
      CAIXAS_PADRAO,
      SEPARAR,
      SETTINGS_PADRAO,
    );

    expect(plan.status).toBe('dados_insuficientes');
    expect(plan.warnings).toEqual([avisoDoTeto('12.003')]);
  });

  it('misturar: 7.000.010 squeezes + 200 cadernetas dariam 100.001 caixas', () => {
    // squeeze na GG: 70. 7.000.010 = 100.000 × 70 + 10 → 100.000 GG cheias de
    // squeeze; os 10 que sobram dividem a última GG com as 200 cadernetas
    // (10/70 + 200/250 = 0,143 + 0,8 = 0,943 ≤ 1) → 100.001 caixas
    const plan = planFreight(
      [
        { row: LINHA_SQUEEZE, quantity: 7_000_010 },
        { row: LINHA_CADERNETA, quantity: 200 },
      ],
      CAIXAS_PADRAO,
      OPCOES,
      SETTINGS_PADRAO,
    );

    expect(plan.status).toBe('dados_insuficientes');
    expect(plan.volumes).toEqual([]);
    expect(plan.warnings).toEqual([avisoDoTeto('100.001')]);
  });

  it('Number.MAX_SAFE_INTEGER de um produto responde em milissegundos', () => {
    // 9.007.199.254.740.991 cadernetas, 250 por GG:
    // cheias = ⌈(9.007.199.254.740.991 − 250) ÷ 250⌉
    //        = ⌈36.028.797.018.962,96⌉ = 36.028.797.018.963
    // sobram 9.007.199.254.740.991 − 36.028.797.018.963 × 250
    //      = 9.007.199.254.740.991 − 9.007.199.254.740.750 = 241 → mais uma GG
    // total: 36.028.797.018.964 caixas
    const inicio = performance.now();
    const plan = planFreight(
      [{ row: LINHA_CADERNETA, quantity: Number.MAX_SAFE_INTEGER }],
      CAIXAS_PADRAO,
      OPCOES,
      SETTINGS_PADRAO,
    );
    const ms = performance.now() - inicio;

    expect(plan.status).toBe('dados_insuficientes');
    expect(plan.volumes).toEqual([]);
    expect(plan.warnings).toEqual([avisoDoTeto('36.028.797.018.964')]);
    // medido: menos de 1 ms. O limite de 1 s é folga para máquina de CI; uma
    // volta de laço por caixa levaria horas e nem chegaria aqui.
    expect(ms).toBeLessThan(1000);
  });

  it('Number.MAX_SAFE_INTEGER no modo misturar também responde em milissegundos', () => {
    // 9.007.199.254.740.991 squeezes = 128.674.275.067.728 × 70 + 31
    // caixa 1: GG cheia (70) · depois 128.674.275.067.727 GG cheias de uma vez
    //   (a última começa com 70 + 31 = 101 squeezes: ainda enche uma GG)
    // sobram 31 squeezes + 200 cadernetas: 31/70 + 200/250 = 0,443 + 0,8 > 1 →
    //   GG com os 31 e ⌊(1 − 31/70) × 250⌋ = ⌊139,29⌋ = 139 cadernetas
    // sobram 61 cadernetas → P (leva 64)
    // total: 1 + 128.674.275.067.727 + 1 + 1 = 128.674.275.067.730 caixas
    const inicio = performance.now();
    const plan = planFreight(
      [
        { row: LINHA_SQUEEZE, quantity: Number.MAX_SAFE_INTEGER },
        { row: LINHA_CADERNETA, quantity: 200 },
      ],
      CAIXAS_PADRAO,
      OPCOES,
      SETTINGS_PADRAO,
    );
    const ms = performance.now() - inicio;

    expect(plan.status).toBe('dados_insuficientes');
    expect(plan.warnings).toEqual([avisoDoTeto('128.674.275.067.730')]);
    expect(ms).toBeLessThan(1000);
  });

  it.each([
    ['duas linhas de MAX_SAFE_INTEGER', [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER], 1],
    ['MAX_SAFE_INTEGER × 2 kits', [Number.MAX_SAFE_INTEGER], 2],
    ['1e300 unidades', [1e300], 1],
  ])('%s: passa de 2^53 − 1 e bloqueia antes de contar caixa', (_caso, quantidades, kits) => {
    // acima de 9.007.199.254.740.991 o JavaScript não conta mais de um em um
    const plan = planFreight(
      quantidades.map((quantity) => ({ row: LINHA_CADERNETA, quantity })),
      CAIXAS_PADRAO,
      { ...OPCOES, kitQuantity: kits },
      SETTINGS_PADRAO,
    );

    expect(plan.status).toBe('dados_insuficientes');
    expect(plan.volumes).toEqual([]);
    expect(plan.warnings).toEqual([
      'Quantidade grande demais para Caderneta A5. Confira a quantidade.',
    ]);
  });
});

describe('planFreight — entrada que não é do tipo prometido', () => {
  const linhas = [{ row: LINHA_CADERNETA, quantity: 3 }];
  const bloqueio = (warnings: string[]) => ({
    ...OPCOES,
    status: 'dados_insuficientes',
    volumes: [],
    totals: TOTAIS_VAZIOS,
    warnings,
    missing: [],
  });

  it('lista de itens nula bloqueia, sem lançar', () => {
    expect(planFreight(lixo(null), CAIXAS_PADRAO, OPCOES, SETTINGS_PADRAO)).toEqual(
      bloqueio(['Itens do plano inválidos: a lista de itens não veio.']),
    );
  });

  it('opções nulas bloqueiam, sem lançar, com o molde do plano vazio', () => {
    expect(planFreight(linhas, CAIXAS_PADRAO, lixo(null), SETTINGS_PADRAO)).toEqual({
      mixMode: 'separar',
      computedAt: '',
      itemsHash: '',
      status: 'dados_insuficientes',
      volumes: [],
      totals: TOTAIS_VAZIOS,
      warnings: ['Opções do plano inválidas: as opções do cálculo não vieram.'],
      missing: [],
    });
  });

  it('linha nula e linha sem row bloqueiam, citando a posição', () => {
    const plan = planFreight(
      lixo([{ row: LINHA_CADERNETA, quantity: 1 }, null, { quantity: 2 }]),
      CAIXAS_PADRAO,
      OPCOES,
      SETTINGS_PADRAO,
    );

    expect(plan).toEqual(
      bloqueio([
        'Item nº 2 inválido: os dados do item não vieram.',
        'Item nº 3 inválido: os dados do produto (row) não vieram.',
      ]),
    );
  });
});

describe('planFreight — caixa sem id ou com id repetido', () => {
  const peq = linhaDeTeste('peq', [10, 10, 10], 500, 'Peça 10 cm');
  const caneta = linhaDeTeste('caneta', [14, 1, 1], 10, 'Caneta');
  const linhas = [
    { row: peq, quantity: 100 },
    { row: caneta, quantity: 1000 },
  ];

  it('controle com ids distintos: 2× GG, cubado 40.000 g', () => {
    // 100 × 500 + 1.000 × 10 = 60.000 g = 2 GG de 30 kg
    // cubado Correios: 2 × 120.000 ÷ 6.000 × 1.000 = 40.000 g
    const plan = planFreight(linhas, CAIXAS_PADRAO, OPCOES, SETTINGS_PADRAO);

    expect(plan.status).toBe('ok');
    expect(plan.totals.boxesByCode).toEqual({ GG: 2 });
    expect(plan.totals.cubicWeightG.correios).toBe(40_000);
  });

  it('sem id: bloqueia (antes saía ok com 6× GG + 1× P e cubado 124.900,5 g)', () => {
    const semId = CAIXAS_PADRAO.map((caixa) => ({ ...caixa, id: undefined }));
    const plan = planFreight(linhas, lixo(semId), OPCOES, SETTINGS_PADRAO);

    expect(plan.status).toBe('dados_insuficientes');
    expect(plan.volumes).toEqual([]);
    expect(plan.warnings).toEqual(
      ['P', 'M', 'G', 'GG'].map(
        (code) =>
          `Caixa ${code} inválida: o id da caixa (id) precisa ser um texto não vazio. Recebido: campo ausente.`,
      ),
    );
  });

  it('todas com o mesmo id: bloqueia, citando as três repetidas', () => {
    const plan = planFreight(
      linhas,
      CAIXAS_PADRAO.map((caixa) => ({ ...caixa, id: 'mesma' })),
      OPCOES,
      SETTINGS_PADRAO,
    );

    expect(plan.status).toBe('dados_insuficientes');
    expect(plan.warnings).toEqual(
      ['M', 'G', 'GG'].map(
        (code) => `Caixa ${code} inválida: o id "mesma" já é de outra caixa da lista.`,
      ),
    );
  });
});

describe('planFreight — limites da lista de caixas e das quantidades', () => {
  it.each([
    ['segunda linha', [5, 2 ** 53], 'Squeeze 500 ml'],
    ['primeira linha', [2 ** 53, 5], 'Caderneta A5'],
  ] as const)(
    'misturar, quantidade grande na %s: o aviso cita a peça certa',
    (_caso, [qCaderneta, qSqueeze], nome) => {
      // 2^53 não é inteiro seguro; a outra linha (5) é. Conferir só o 1º item do
      // grupo acusaria (ou deixaria passar) a peça errada.
      const plan = planFreight(
        [
          { row: LINHA_CADERNETA, quantity: qCaderneta },
          { row: LINHA_SQUEEZE, quantity: qSqueeze },
        ],
        CAIXAS_PADRAO,
        OPCOES,
        SETTINGS_PADRAO,
      );

      expect(plan.status).toBe('dados_insuficientes');
      expect(plan.warnings).toEqual([
        `Quantidade grande demais para ${nome}. Confira a quantidade.`,
      ]);
    },
  );
});
