/**
 * validateConfig.test.ts — conferência das caixas e dos parâmetros antes do plano.
 *
 * Cada caso entrega um valor que o banco hoje recusa (NOT NULL e CHECK > 0 em
 * `shipping_boxes` e `freight_settings`), mas que um adaptador banco → motor
 * errado deixaria chegar. O aviso é conferido por texto exato: é ele que diz a
 * quem cadastrou qual campo corrigir.
 */
import { describe, expect, it } from 'vitest';

import { validateConfig, validateEntrada } from '../validateConfig';
import { CAIXAS_PADRAO, CAIXA_GG, CAIXA_P, SETTINGS_PADRAO } from './fixtures/boxes';

const AVISO_CORREIOS =
  'Parâmetro de frete inválido: o divisor do peso cubado dos Correios (cubicDivisorCorreios) precisa ser um número maior que zero.';
const AVISO_RODOVIARIO =
  'Parâmetro de frete inválido: o divisor do peso cubado rodoviário (cubicDivisorRodoviario) precisa ser um número maior que zero.';
const AVISO_FATOR =
  'Parâmetro de frete inválido: o fator de aproveitamento padrão (defaultFillFactor) precisa ser um número maior que zero e no máximo 1.';

describe('validateConfig — entrada válida', () => {
  it('as quatro caixas e os parâmetros padrão passam', () => {
    expect(validateConfig(CAIXAS_PADRAO, SETTINGS_PADRAO)).toEqual([]);
  });

  it('lista de caixas vazia não é problema daqui: o plano responde "nao_cabe"', () => {
    expect(validateConfig([], SETTINGS_PADRAO)).toEqual([]);
  });

  it('fator padrão exatamente 1 passa: o intervalo é (0, 1]', () => {
    expect(validateConfig(CAIXAS_PADRAO, { ...SETTINGS_PADRAO, defaultFillFactor: 1 })).toEqual([]);
  });

  it('fator da própria caixa fora de (0, 1] não bloqueia: vale o padrão global', () => {
    const caixas = [
      { ...CAIXA_P, fillFactor: 0 },
      { ...CAIXA_GG, fillFactor: 1.5 },
    ];
    expect(validateConfig(caixas, SETTINGS_PADRAO)).toEqual([]);
  });

  it('caixa vazia de 0 g passa: o limite é "maior ou igual a zero"', () => {
    expect(validateConfig([{ ...CAIXA_P, emptyWeightG: 0 }], SETTINGS_PADRAO)).toEqual([]);
  });

  it('peso máximo 1 g acima do peso da caixa vazia passa', () => {
    // 10.000 g de máximo e 9.999 g de caixa vazia: 10.000 > 9.999
    expect(validateConfig([{ ...CAIXA_P, emptyWeightG: 9999 }], SETTINGS_PADRAO)).toEqual([]);
  });
});

describe('validateConfig — parâmetros', () => {
  it.each([
    [0, '0'],
    [-6000, '-6000'],
    [Number.NaN, 'NaN'],
    [Number.POSITIVE_INFINITY, 'Infinity'],
    ['6000', 'texto "6000"'],
    [null, 'campo vazio'],
    [undefined, 'campo ausente'],
    [true, 'valor que não é número'],
  ])('divisor dos Correios %s é recusado', (valor, recebido) => {
    const settings = { ...SETTINGS_PADRAO, cubicDivisorCorreios: valor };
    expect(validateConfig(CAIXAS_PADRAO, settings)).toEqual([
      `${AVISO_CORREIOS} Recebido: ${recebido}.`,
    ]);
  });

  it('divisor rodoviário zero é recusado com o nome do campo dele', () => {
    const settings = { ...SETTINGS_PADRAO, cubicDivisorRodoviario: 0 };
    expect(validateConfig(CAIXAS_PADRAO, settings)).toEqual([`${AVISO_RODOVIARIO} Recebido: 0.`]);
  });

  it.each([
    [0, '0'],
    [-0.9, '-0.9'],
    [1.01, '1.01'],
    ['0.9', 'texto "0.9"'],
    [null, 'campo vazio'],
  ])('fator de aproveitamento padrão %s é recusado', (valor, recebido) => {
    const settings = { ...SETTINGS_PADRAO, defaultFillFactor: valor };
    expect(validateConfig(CAIXAS_PADRAO, settings)).toEqual([
      `${AVISO_FATOR} Recebido: ${recebido}.`,
    ]);
  });

  it('linha crua de freight_settings (snake_case): os três campos faltam', () => {
    // o motor lê cubicDivisorCorreios; a linha do banco traz cubic_divisor_correios
    const linhaDoBanco = {
      cubic_divisor_correios: 6000,
      cubic_divisor_rodoviario: 3333,
      default_fill_factor: 0.9,
    };
    expect(validateConfig(CAIXAS_PADRAO, linhaDoBanco)).toEqual([
      `${AVISO_CORREIOS} Recebido: campo ausente.`,
      `${AVISO_RODOVIARIO} Recebido: campo ausente.`,
      `${AVISO_FATOR} Recebido: campo ausente.`,
    ]);
  });

  it.each([null, undefined, 'x', 42])('parâmetros que não são objeto (%s)', (settings) => {
    expect(validateConfig(CAIXAS_PADRAO, settings)).toEqual([
      `${AVISO_CORREIOS} Recebido: campo ausente.`,
      `${AVISO_RODOVIARIO} Recebido: campo ausente.`,
      `${AVISO_FATOR} Recebido: campo ausente.`,
    ]);
  });
});

describe('validateConfig — caixas', () => {
  it('lista que não é lista é recusada', () => {
    expect(validateConfig(null, SETTINGS_PADRAO)).toEqual([
      'Caixas de transporte inválidas: a lista de caixas não veio.',
    ]);
  });

  it('caixa que não é objeto é citada pela posição na lista', () => {
    expect(validateConfig([CAIXA_P, null], SETTINGS_PADRAO)).toEqual([
      'Caixa nº 2 inválida: os dados da caixa não vieram.',
    ]);
  });

  it.each([
    ['inner', 'heightCm', 'a altura interna'],
    ['inner', 'widthCm', 'a largura interna'],
    ['inner', 'lengthCm', 'o comprimento interno'],
    ['outer', 'heightCm', 'a altura externa'],
    ['outer', 'widthCm', 'a largura externa'],
    ['outer', 'lengthCm', 'o comprimento externo'],
  ] as const)('lado zerado em %s.%s é recusado', (face, lado, rotulo) => {
    const caixa = { ...CAIXA_GG, [face]: { ...CAIXA_GG[face], [lado]: 0 } };
    expect(validateConfig([caixa], SETTINGS_PADRAO)).toEqual([
      `Caixa GG inválida: ${rotulo} (${face}.${lado}) precisa ser um número maior que zero. Recebido: 0.`,
    ]);
  });

  it('lado interno negativo é recusado: não vira caixa que "cabe"', () => {
    const caixa = { ...CAIXA_GG, inner: { ...CAIXA_GG.inner, heightCm: -39.4 } };
    expect(validateConfig([caixa], SETTINGS_PADRAO)).toEqual([
      'Caixa GG inválida: a altura interna (inner.heightCm) precisa ser um número maior que zero. Recebido: -39.4.',
    ]);
  });

  it('medidas externas ausentes: um aviso por lado', () => {
    // sem a externa o peso cubado e o m³ sairiam 0
    expect(validateConfig([{ ...CAIXA_GG, outer: null }], SETTINGS_PADRAO)).toEqual([
      'Caixa GG inválida: a altura externa (outer.heightCm) precisa ser um número maior que zero. Recebido: campo ausente.',
      'Caixa GG inválida: a largura externa (outer.widthCm) precisa ser um número maior que zero. Recebido: campo ausente.',
      'Caixa GG inválida: o comprimento externo (outer.lengthCm) precisa ser um número maior que zero. Recebido: campo ausente.',
    ]);
  });

  it.each([
    [-500, '-500'],
    ['250', 'texto "250"'],
    [null, 'campo vazio'],
  ])('peso da caixa vazia %s é recusado', (valor, recebido) => {
    expect(validateConfig([{ ...CAIXA_GG, emptyWeightG: valor }], SETTINGS_PADRAO)).toEqual([
      `Caixa GG inválida: o peso da caixa vazia (emptyWeightG) precisa ser um número maior ou igual a zero. Recebido: ${recebido}.`,
    ]);
  });

  it.each([
    [0, '0'],
    [-1, '-1'],
    ['30000', 'texto "30000"'],
    [undefined, 'campo ausente'],
  ])('peso máximo %s é recusado', (valor, recebido) => {
    expect(validateConfig([{ ...CAIXA_GG, maxWeightG: valor }], SETTINGS_PADRAO)).toEqual([
      `Caixa GG inválida: o peso máximo (maxWeightG) precisa ser um número maior que zero. Recebido: ${recebido}.`,
    ]);
  });

  it.each([30_000, 30_001])(
    'caixa vazia de %d g numa GG de 30.000 g: não sobra peso útil',
    (emptyWeightG) => {
      // peso útil = máximo − vazia: 30.000 − 30.000 = 0 e 30.000 − 30.001 = −1
      expect(validateConfig([{ ...CAIXA_GG, emptyWeightG }], SETTINGS_PADRAO)).toEqual([
        `Caixa GG inválida: o peso máximo (maxWeightG = 30000) precisa ser maior que o peso da caixa vazia (emptyWeightG = ${emptyWeightG}).`,
      ]);
    },
  );

  it('os dois pesos inválidos: um aviso para cada, sem comparar um com o outro', () => {
    const caixa = { ...CAIXA_GG, emptyWeightG: '250', maxWeightG: -1 };
    expect(validateConfig([caixa], SETTINGS_PADRAO)).toEqual([
      'Caixa GG inválida: o peso da caixa vazia (emptyWeightG) precisa ser um número maior ou igual a zero. Recebido: texto "250".',
      'Caixa GG inválida: o peso máximo (maxWeightG) precisa ser um número maior que zero. Recebido: -1.',
    ]);
  });

  it.each(['', 42, undefined])('caixa sem código (%s) é citada pela posição', (code) => {
    const caixa = { ...CAIXA_GG, code, maxWeightG: 0 };
    expect(validateConfig([CAIXA_P, caixa], SETTINGS_PADRAO)).toEqual([
      'Caixa nº 2 inválida: o peso máximo (maxWeightG) precisa ser um número maior que zero. Recebido: 0.',
    ]);
  });

  it('parâmetros vêm antes das caixas, e as caixas na ordem da lista', () => {
    const caixas = [
      { ...CAIXA_P, maxWeightG: 0 },
      CAIXA_GG,
      { ...CAIXA_GG, id: 'fixture-xg', code: 'XG', emptyWeightG: -1 },
    ];
    const settings = { ...SETTINGS_PADRAO, cubicDivisorRodoviario: 0 };
    expect(validateConfig(caixas, settings)).toEqual([
      `${AVISO_RODOVIARIO} Recebido: 0.`,
      'Caixa P inválida: o peso máximo (maxWeightG) precisa ser um número maior que zero. Recebido: 0.',
      'Caixa XG inválida: o peso da caixa vazia (emptyWeightG) precisa ser um número maior ou igual a zero. Recebido: -1.',
    ]);
  });

  it('parâmetros inválidos e lista ausente saem juntos', () => {
    expect(validateConfig(undefined, { ...SETTINGS_PADRAO, cubicDivisorCorreios: 0 })).toEqual([
      `${AVISO_CORREIOS} Recebido: 0.`,
      'Caixas de transporte inválidas: a lista de caixas não veio.',
    ]);
  });
});

describe('validateConfig — id da caixa', () => {
  it.each([
    [undefined, 'campo ausente'],
    ['', 'texto ""'],
    [42, '42'],
    [null, 'campo vazio'],
  ])('id %s é recusado: o empacotador distingue as caixas pelo id', (id, recebido) => {
    expect(validateConfig([{ ...CAIXA_GG, id }], SETTINGS_PADRAO)).toEqual([
      `Caixa GG inválida: o id da caixa (id) precisa ser um texto não vazio. Recebido: ${recebido}.`,
    ]);
  });

  it('id repetido: a segunda caixa da lista é a citada, pelo código', () => {
    // P e M com o mesmo id: a 1ª passa, a 2ª (M) repete
    expect(validateConfig([CAIXA_P, { ...CAIXA_GG, id: CAIXA_P.id }], SETTINGS_PADRAO)).toEqual([
      'Caixa GG inválida: o id "fixture-p" já é de outra caixa da lista.',
    ]);
  });

  it('quatro caixas padrão têm ids distintos e passam', () => {
    expect(validateConfig(CAIXAS_PADRAO, SETTINGS_PADRAO)).toEqual([]);
  });
});

describe('validateConfig — externa menor que a interna', () => {
  it.each([
    ['heightCm', 'a altura externa', 39],
    ['widthCm', 'a largura externa', 49],
    ['lengthCm', 'o comprimento externo', 59],
  ] as const)('%s externo abaixo do interno é recusado', (lado, rotulo, externo) => {
    // GG interna 39,4 × 49,4 × 59,4: externa 39 / 49 / 59 é menor que a interna
    const caixa = { ...CAIXA_GG, outer: { ...CAIXA_GG.outer, [lado]: externo } };
    expect(validateConfig([caixa], SETTINGS_PADRAO)).toEqual([
      `Caixa GG inválida: ${rotulo} (outer.${lado} = ${externo}) não pode ser menor que a interna (inner.${lado} = ${CAIXA_GG.inner[lado]}).`,
    ]);
  });

  it('medidas da externa em metros (0,4 × 0,5 × 0,6) bloqueiam os três lados', () => {
    const caixa = { ...CAIXA_GG, outer: { heightCm: 0.4, widthCm: 0.5, lengthCm: 0.6 } };
    expect(validateConfig([caixa], SETTINGS_PADRAO)).toHaveLength(3);
  });

  it('lado externo igual ao interno passa', () => {
    const caixa = { ...CAIXA_GG, outer: CAIXA_GG.inner };
    expect(validateConfig([caixa], SETTINGS_PADRAO)).toEqual([]);
  });
});

describe('validateEntrada', () => {
  const OPCOES = { mixMode: 'separar', computedAt: 'T', itemsHash: 'h' };

  it('lista com linha e opções no lugar passa', () => {
    expect(validateEntrada([{ row: {}, quantity: 1 }], OPCOES)).toEqual([]);
  });

  it('lista vazia passa: o plano trata o "nada para despachar"', () => {
    expect(validateEntrada([], OPCOES)).toEqual([]);
  });

  it.each([null, undefined, 'lista', { length: 1 }])('lista %s é recusada', (inputs) => {
    expect(validateEntrada(inputs, OPCOES)).toEqual([
      'Itens do plano inválidos: a lista de itens não veio.',
    ]);
  });

  it.each([null, undefined, 3])('opções %s são recusadas', (options) => {
    expect(validateEntrada([], options)).toEqual([
      'Opções do plano inválidas: as opções do cálculo não vieram.',
    ]);
  });

  it('opções e lista inválidas saem juntas', () => {
    expect(validateEntrada(null, null)).toEqual([
      'Opções do plano inválidas: as opções do cálculo não vieram.',
      'Itens do plano inválidos: a lista de itens não veio.',
    ]);
  });

  it('linha nula e linha sem row são citadas pela posição', () => {
    expect(validateEntrada([{ row: {} }, null, { quantity: 2 }, { row: null }], OPCOES)).toEqual([
      'Item nº 2 inválido: os dados do item não vieram.',
      'Item nº 3 inválido: os dados do produto (row) não vieram.',
      'Item nº 4 inválido: os dados do produto (row) não vieram.',
    ]);
  });
});
