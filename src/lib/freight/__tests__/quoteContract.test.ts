/**
 * quoteContract.test.ts — contrato da cotação Promo → Loggi (etapa 81).
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { planFreight } from '../planFreight';
import {
  buildQuoteRequest,
  QUOTE_ERROR_CODES,
  quoteErrorSchema,
  quoteRequestSchema,
  quoteResponseSchema,
  rotuloDoCaminho,
} from '../quoteContract';
import { CAIXA_G, CAIXA_P, SETTINGS_PADRAO } from './fixtures/boxes';
import { LINHA_BARRA_61, LINHA_CADERNETA, LINHA_SEM_PESO } from './fixtures/items';

const OPCOES = {
  mixMode: 'misturar',
  computedAt: '2026-11-20T12:00:00.000Z',
  itemsHash: 'abc12345',
} as const;

const PEDIDO_VALIDO = {
  origin_cep: '03377-000',
  destination_cep: '01000-000',
  declared_value_brl: 4800.5,
  volumes: [{ height_cm: 36, width_cm: 36, length_cm: 54, weight_g: 16800 }],
  ready_date: '2026-12-03',
};

const RESPOSTA_VALIDA = {
  quote_id: 'q_7f3a91',
  options: [
    {
      carrier: 'Rodonaves',
      service: 'Rodoviário',
      price_brl: 182.4,
      transit_business_days: 4,
      option_id: 'rdn-rod-01',
    },
  ],
  computed_at: '2026-11-20T14:05:00-03:00',
};

describe('quoteRequestSchema', () => {
  it('aceita o pedido válido, com e sem ready_date', () => {
    expect(quoteRequestSchema.safeParse(PEDIDO_VALIDO).success).toBe(true);
    const { ready_date: _omitido, ...semData } = PEDIDO_VALIDO;
    expect(quoteRequestSchema.safeParse(semData).success).toBe(true);
  });

  it.each([
    ['CEP de origem sem hífen', { origin_cep: '13015000' }],
    ['CEP de destino curto', { destination_cep: '1000-000' }],
    ['CEP com letra', { destination_cep: '0100A-000' }],
    ['valor declarado zero', { declared_value_brl: 0 }],
    ['valor declarado negativo', { declared_value_brl: -10 }],
    ['volumes vazio', { volumes: [] }],
    ['sem volumes', { volumes: undefined }],
    ['altura zero', { volumes: [{ ...PEDIDO_VALIDO.volumes[0], height_cm: 0 }] }],
    ['largura negativa', { volumes: [{ ...PEDIDO_VALIDO.volumes[0], width_cm: -1 }] }],
    ['peso fracionado', { volumes: [{ ...PEDIDO_VALIDO.volumes[0], weight_g: 100.5 }] }],
    ['peso zero', { volumes: [{ ...PEDIDO_VALIDO.volumes[0], weight_g: 0 }] }],
    ['data pronta em formato BR', { ready_date: '03/12/2026' }],
    ['data pronta inexistente', { ready_date: '2026-13-45' }],
    // fevereiro tem 28 dias em 2026; abril tem 30: Date.parse rolaria para março e maio
    ['data pronta 30 de fevereiro', { ready_date: '2026-02-30' }],
    ['data pronta 31 de abril', { ready_date: '2026-04-31' }],
  ])('recusa: %s', (_nome, estrago) => {
    expect(quoteRequestSchema.safeParse({ ...PEDIDO_VALIDO, ...estrago }).success).toBe(false);
  });
});

describe('quoteResponseSchema', () => {
  it('aceita a resposta válida, com delivery_date opcional', () => {
    expect(quoteResponseSchema.safeParse(RESPOSTA_VALIDA).success).toBe(true);
    const comData = {
      ...RESPOSTA_VALIDA,
      options: [
        { ...RESPOSTA_VALIDA.options[0], delivery_date: '2026-12-07', transit_business_days: 0 },
      ],
    };
    expect(quoteResponseSchema.safeParse(comData).success).toBe(true);
  });

  it.each([
    ['sem opções', { options: [] }],
    ['sem quote_id', { quote_id: '' }],
    ['computed_at sem fuso', { computed_at: '2026-11-20T14:05:00' }],
    ['computed_at não é data', { computed_at: 'ontem' }],
    ['preço zero', { options: [{ ...RESPOSTA_VALIDA.options[0], price_brl: 0 }] }],
    [
      'prazo fracionado',
      { options: [{ ...RESPOSTA_VALIDA.options[0], transit_business_days: 1.5 }] },
    ],
    ['prazo negativo', { options: [{ ...RESPOSTA_VALIDA.options[0], transit_business_days: -1 }] }],
    ['sem option_id', { options: [{ ...RESPOSTA_VALIDA.options[0], option_id: '' }] }],
    [
      'delivery_date 30 de fevereiro',
      { options: [{ ...RESPOSTA_VALIDA.options[0], delivery_date: '2026-02-30' }] },
    ],
    [
      'delivery_date 31 de abril',
      { options: [{ ...RESPOSTA_VALIDA.options[0], delivery_date: '2026-04-31' }] },
    ],
    [
      'delivery_date inválida',
      { options: [{ ...RESPOSTA_VALIDA.options[0], delivery_date: '7/12' }] },
    ],
  ])('recusa: %s', (_nome, estrago) => {
    expect(quoteResponseSchema.safeParse({ ...RESPOSTA_VALIDA, ...estrago }).success).toBe(false);
  });
});

describe('quoteErrorSchema', () => {
  it.each(Object.entries(QUOTE_ERROR_CODES))(
    'status %s tem o código %s no corpo',
    (_status, code) => {
      expect(quoteErrorSchema.safeParse({ error: code, message: 'falhou' }).success).toBe(true);
    },
  );

  it('recusa código fora da lista', () => {
    expect(quoteErrorSchema.safeParse({ error: 'boom', message: 'x' }).success).toBe(false);
  });
});

describe('buildQuoteRequest', () => {
  const params = {
    originCep: '03377-000',
    destinationCep: '01000-000',
    declaredValueBrl: 1500,
    readyDate: '2026-12-03',
  };

  it('usa a medida EXTERNA da caixa e o peso bruto de cada volume', () => {
    // 460 cadernetas só em P e G: 3 × G (36 × 36 × 54 cm, 140 × 120 g = 16.800 g) + 1 × P
    // (27 × 33 × 33 cm, 40 × 120 g = 4.800 g). Interna da G seria 35,4 × 35,4 × 53,4.
    const plano = planFreight(
      [{ row: LINHA_CADERNETA, quantity: 460 }],
      [CAIXA_P, CAIXA_G],
      OPCOES,
      SETTINGS_PADRAO,
    );
    const r = buildQuoteRequest(plano, params);

    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(r.request.volumes).toEqual([
      { height_cm: 36, width_cm: 36, length_cm: 54, weight_g: 16800 },
      { height_cm: 36, width_cm: 36, length_cm: 54, weight_g: 16800 },
      { height_cm: 36, width_cm: 36, length_cm: 54, weight_g: 16800 },
      { height_cm: 27, width_cm: 33, length_cm: 33, weight_g: 4800 },
    ]);
    expect(r.request).toMatchObject({
      origin_cep: '03377-000',
      destination_cep: '01000-000',
      declared_value_brl: 1500,
      ready_date: '2026-12-03',
    });
    expect(quoteRequestSchema.safeParse(r.request).success).toBe(true);
  });

  it('sem readyDate o pedido não leva ready_date', () => {
    const plano = planFreight(
      [{ row: LINHA_CADERNETA, quantity: 10 }],
      [CAIXA_P],
      OPCOES,
      SETTINGS_PADRAO,
    );
    const r = buildQuoteRequest(plano, { ...params, readyDate: undefined });
    expect(r.status === 'ok' && 'ready_date' in r.request).toBe(false);
  });

  it('peso fracionado sobe para o grama inteiro', () => {
    const plano = planFreight(
      [{ row: LINHA_CADERNETA, quantity: 10 }],
      [CAIXA_P],
      OPCOES,
      SETTINGS_PADRAO,
    );
    const fracionado = {
      ...plano,
      volumes: plano.volumes.map((v) => ({ ...v, grossWeightG: 1200.2 })),
    };
    const r = buildQuoteRequest(fracionado, params);
    expect(r.status === 'ok' && r.request.volumes[0].weight_g).toBe(1201);
  });

  it.each([
    [
      'dados insuficientes',
      planFreight([{ row: LINHA_SEM_PESO, quantity: 1 }], [CAIXA_P], OPCOES, SETTINGS_PADRAO),
    ],
    [
      'não cabe',
      planFreight([{ row: LINHA_BARRA_61, quantity: 1 }], [CAIXA_P], OPCOES, SETTINGS_PADRAO),
    ],
  ])('recusa plano que não está ok: %s', (_nome, plano) => {
    expect(buildQuoteRequest(plano, params)).toEqual({
      status: 'error',
      reason: 'O plano de frete não está calculado: complete os dados dos produtos antes de cotar.',
    });
  });

  const planoOk = () =>
    planFreight([{ row: LINHA_CADERNETA, quantity: 10 }], [CAIXA_P], OPCOES, SETTINGS_PADRAO);

  it.each([
    ['CEP de destino', { destinationCep: '01000000' }, 'CEP de destino:'],
    ['CEP de origem', { originCep: '1' }, 'CEP de origem:'],
    ['valor declarado', { declaredValueBrl: 0 }, 'Valor declarado:'],
    ['valor declarado NaN', { declaredValueBrl: Number.NaN }, 'Valor declarado: informe um número'],
    ['data pronta', { readyDate: 'amanhã' }, 'Data de prontidão:'],
    ['data pronta 2026-02-30', { readyDate: '2026-02-30' }, 'Data de prontidão: a data não existe'],
    ['data pronta 2026-04-31', { readyDate: '2026-04-31' }, 'Data de prontidão: a data não existe'],
  ])('devolve erro em PT-BR com rótulo para %s inválido', (_nome, estrago, trecho) => {
    const r = buildQuoteRequest(planoOk(), { ...params, ...estrago });
    expect(r.status).toBe('error');
    const reason = r.status === 'error' ? r.reason : '';
    expect(reason).toContain(trecho);
    // sem caminho técnico nem inglês
    expect(reason).not.toMatch(/_cep|_brl|_date|volumes\.\d|Invalid|expected|received/);
  });

  it('plano ok sem volumes é recusado pelo contrato, com rótulo', () => {
    const r = buildQuoteRequest({ ...planoOk(), volumes: [] }, params);
    expect(r).toMatchObject({ status: 'error' });
    expect(r.status === 'error' && r.reason).toContain('Volumes: informe ao menos um volume');
  });

  it('volume sem peso é nomeado como Volume 1', () => {
    const plano = planoOk();
    const zerado = plano.volumes.map((v) => ({ ...v, grossWeightG: 0 }));
    const r = buildQuoteRequest({ ...plano, volumes: zerado }, params);
    expect(r.status === 'error' && r.reason).toContain('Volume 1, peso: o peso deve ser maior');
  });

  it('nunca lança: plano null e params undefined viram erro', () => {
    expect(buildQuoteRequest(null, params)).toMatchObject({ status: 'error' });
    expect(buildQuoteRequest(planoOk(), undefined)).toEqual({
      status: 'error',
      reason: 'Informe o CEP de origem, o CEP de destino e o valor declarado para cotar.',
    });
  });
});

describe('rotuloDoCaminho', () => {
  it.each([
    [['volumes', 2, 'length_cm'], 'Volume 3, comprimento'],
    [['volumes'], 'Volumes'],
    [['campo_novo'], 'Cotação'],
    [[], 'Cotação'],
  ])('%j vira %s', (caminho, esperado) => {
    expect(rotuloDoCaminho(caminho)).toBe(esperado);
  });
});

describe('docs/frete/contrato-cotacao-loggi.md', () => {
  it('o sha256 do rodapé confere com o bloco de contrato', () => {
    const doc = readFileSync(
      resolve(__dirname, '../../../../docs/frete/contrato-cotacao-loggi.md'),
      'utf8',
    );
    const bloco = /```text\n([\s\S]*?)```/.exec(doc);
    const rodape = /sha256 do bloco.*`([0-9a-f]{64})`/.exec(doc);

    expect(bloco).not.toBeNull();
    expect(rodape).not.toBeNull();
    expect(
      createHash('sha256')
        .update(bloco?.[1] ?? '')
        .digest('hex'),
    ).toBe(rodape?.[1]);
  });
});
