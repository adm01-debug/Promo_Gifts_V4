/**
 * planSchema.test.ts — formato salvo do plano de frete (etapa 62).
 */
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';

import {
  type freightPlanBodySchema,
  type freightPlanSchema,
  FREIGHT_PLAN_SCHEMA_MATCHES_TYPE,
  FREIGHT_PLAN_VERSION,
  parseStoredFreightPlan,
  STALE_PLAN_REASON,
  toStoredFreightPlan,
} from '../planSchema';
import { planFreight } from '../planFreight';
import type { FreightPlan } from '../types';
import { CAIXA_G, CAIXA_P, SETTINGS_PADRAO } from './fixtures/boxes';
import { LINHA_BARRA_61, LINHA_CADERNETA, LINHA_SEM_PESO } from './fixtures/items';

type Corpo = z.infer<typeof freightPlanBodySchema>;

// Compilar estas duas funções prova a atribuição nos dois sentidos, sem cast.
function corpoParaPlano(corpo: Corpo): FreightPlan {
  return corpo;
}
function planoParaCorpo(plano: FreightPlan): Corpo {
  return plano;
}

const OPCOES = {
  mixMode: 'misturar',
  computedAt: '2026-11-20T12:00:00.000Z',
  itemsHash: 'abc12345',
} as const;

/** 460 cadernetas sem a GG: 3× G + 1× P (conta fechada em planFreight.test.ts). */
const PLANO_REAL = planFreight(
  [{ row: LINHA_CADERNETA, quantity: 460 }],
  [CAIXA_P, CAIXA_G],
  OPCOES,
  SETTINGS_PADRAO,
);

describe('freightPlanSchema — tipo', () => {
  it('z.infer do corpo é idêntico a FreightPlan, nos dois sentidos', () => {
    expectTypeOf<Corpo>().toEqualTypeOf<FreightPlan>();
    expectTypeOf(corpoParaPlano).returns.toEqualTypeOf<FreightPlan>();
    expectTypeOf(planoParaCorpo).returns.toEqualTypeOf<Corpo>();
  });

  it('a guarda de tipo do schema (conferida pelo typecheck de src) está exportada', () => {
    expect(FREIGHT_PLAN_SCHEMA_MATCHES_TYPE).toBe(true);
  });

  it('o envelope salvo é o plano mais version: 1', () => {
    type Salvo = z.infer<typeof freightPlanSchema>;
    expectTypeOf<Omit<Salvo, 'version'>>().toEqualTypeOf<FreightPlan>();
    expectTypeOf<Salvo['version']>().toEqualTypeOf<1>();
    expect(FREIGHT_PLAN_VERSION).toBe(1);
  });
});

describe('parseStoredFreightPlan', () => {
  it('plano REAL gerado por planFreight passa e volta idêntico, sem version', () => {
    expect(PLANO_REAL.status).toBe('ok');
    // 460 cadernetas: 3 × G + 1 × P (2 tipos de caixa, 4 volumes)
    expect(PLANO_REAL.volumes).toHaveLength(4);

    const salvo = JSON.parse(JSON.stringify(toStoredFreightPlan(PLANO_REAL)));
    expect(parseStoredFreightPlan(salvo)).toEqual({ status: 'ok', plan: PLANO_REAL });
  });

  it.each([0, 1.5])(
    'caixa com fillFactor %s (fallback para o fator global no motor) volta a ler',
    (fillFactor) => {
      // O motor usa o fator global no lugar de um fator fora de (0, 1], mas grava
      // a caixa como veio: o plano salvo tem fillFactor 0 ou 1,5 e continua válido.
      const plano = planFreight(
        [{ row: LINHA_CADERNETA, quantity: 460 }],
        [{ ...CAIXA_P, fillFactor }, CAIXA_G],
        OPCOES,
        SETTINGS_PADRAO,
      );
      expect(plano.status).toBe('ok');
      const salvo = JSON.parse(JSON.stringify(toStoredFreightPlan(plano)));
      expect(parseStoredFreightPlan(salvo)).toEqual({ status: 'ok', plan: plano });
    },
  );

  it('o JSON salvo carrega version: 1 e o plano devolvido não', () => {
    const salvo = toStoredFreightPlan(PLANO_REAL);
    expect(salvo.version).toBe(1);
    const lido = parseStoredFreightPlan(salvo);
    expect(lido.status === 'ok' && 'version' in lido.plan).toBe(false);
  });

  it.each([
    [
      'dados_insuficientes (produto sem peso)',
      planFreight([{ row: LINHA_SEM_PESO, quantity: 2 }], [CAIXA_P], OPCOES, SETTINGS_PADRAO),
    ],
    [
      'nao_cabe (barra de 61 cm)',
      planFreight(
        [{ row: LINHA_BARRA_61, quantity: 1 }],
        [CAIXA_P, CAIXA_G],
        OPCOES,
        SETTINGS_PADRAO,
      ),
    ],
  ])('plano bloqueado também é válido: %s', (_nome, plano) => {
    expect(plano.status).not.toBe('ok');
    const lido = parseStoredFreightPlan(JSON.parse(JSON.stringify(toStoredFreightPlan(plano))));
    expect(lido).toEqual({ status: 'ok', plan: plano });
  });

  it('sem version = plano antigo', () => {
    expect(parseStoredFreightPlan(JSON.parse(JSON.stringify(PLANO_REAL)))).toEqual({
      status: 'invalid',
      reason: STALE_PLAN_REASON,
    });
  });

  it.each([[0], [2], ['1'], [null]])('version %p desconhecida = plano antigo', (version) => {
    const lido = parseStoredFreightPlan({ ...PLANO_REAL, version });
    expect(lido).toEqual({ status: 'invalid', reason: STALE_PLAN_REASON });
  });

  it.each([[null], [undefined], ['texto'], [42], [[]], [{}]])('valor %p não é plano', (valor) => {
    expect(parseStoredFreightPlan(valor)).toEqual({ status: 'invalid', reason: STALE_PLAN_REASON });
  });

  it.each([
    ['status fora da lista', { status: 'quase' }],
    ['volumes que não é lista', { volumes: 'x' }],
    ['peso bruto negativo', { totals: { ...PLANO_REAL.totals, grossWeightG: -1 } }],
    ['mixMode desconhecido', { mixMode: 'juntar' }],
    ['sem itemsHash', { itemsHash: undefined }],
    ['status ok sem volumes', { volumes: [] }],
    [
      'status dados_insuficientes com volumes',
      { status: 'dados_insuficientes', volumes: PLANO_REAL.volumes },
    ],
    ['computedAt que não é data ISO', { computedAt: 'ontem' }],
    ['computedAt vazio', { computedAt: '' }],
    ['campo faltante desconhecido', { missing: [{ productId: 'p', name: 'n', missing: ['cor'] }] }],
  ])('plano inválido: %s', (_nome, estrago) => {
    const lido = parseStoredFreightPlan({ ...toStoredFreightPlan(PLANO_REAL), ...estrago });
    expect(lido).toEqual({ status: 'invalid', reason: STALE_PLAN_REASON });
  });
});
