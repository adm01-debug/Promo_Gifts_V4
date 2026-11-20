/**
 * format.test.ts — o texto do plano para o cliente: só totais.
 */
import { describe, expect, it } from 'vitest';

import { formatPlanForClient } from '../format';
import { planFreight, type PlanOptions } from '../planFreight';
import { CAIXAS_PADRAO, CAIXA_G, CAIXA_M, CAIXA_P, SETTINGS_PADRAO } from './fixtures/boxes';
import { LINHA_BARRA_61, LINHA_CADERNETA, LINHA_SEM_PESO } from './fixtures/items';

const OPCOES: PlanOptions = {
  mixMode: 'misturar',
  computedAt: '2026-11-19T12:00:00.000Z',
  itemsHash: 'hash-de-teste',
};

describe('formatPlanForClient', () => {
  it('460 cadernetas em P/M/G: 4 volumes, peso bruto e m³ em pt-BR', () => {
    // 3× G + 1× P = 4 volumes
    // peso bruto 460 × 120 g = 55.200 g = 55,2 kg
    // volume externo 239.355 cm³ = 0,24 m³
    const plan = planFreight(
      [{ row: LINHA_CADERNETA, quantity: 460 }],
      [CAIXA_P, CAIXA_M, CAIXA_G],
      OPCOES,
      SETTINGS_PADRAO,
    );

    expect(formatPlanForClient(plan)).toBe('4 volumes · 55,2 kg · 0,24 m³');
  });

  it('um volume só: singular', () => {
    // 250 × 120 g = 30.000 g = 30,0 kg ; externa da GG 40 × 50 × 60 = 120.000 cm³ = 0,12 m³
    const plan = planFreight(
      [{ row: LINHA_CADERNETA, quantity: 250 }],
      CAIXAS_PADRAO,
      OPCOES,
      SETTINGS_PADRAO,
    );

    expect(formatPlanForClient(plan)).toBe('1 volume · 30,0 kg · 0,12 m³');
  });

  it('peso total abaixo de 1 kg sai em gramas', () => {
    // 1 chaveiro de 20 g na caixa P: 20 g ; externa da P 27 × 33 × 33 = 29.403 cm³ = 0,03 m³
    const plan = planFreight(
      [{ row: { ...LINHA_CADERNETA, weight_g: 20 }, quantity: 1 }],
      CAIXAS_PADRAO,
      OPCOES,
      SETTINGS_PADRAO,
    );

    expect(formatPlanForClient(plan)).toBe('1 volume · 20 g · 0,03 m³');
  });

  it('não vaza conversa interna: sem ocupação, fator, cubado, código de caixa nem aviso', () => {
    // O plano de 250 cadernetas na GG tem aviso ("fechou no peso máximo") e cubado.
    const plan = planFreight(
      [{ row: LINHA_CADERNETA, quantity: 250 }],
      CAIXAS_PADRAO,
      OPCOES,
      SETTINGS_PADRAO,
    );
    expect(plan.warnings).not.toHaveLength(0);

    const texto = formatPlanForClient(plan).toLowerCase();

    expect(texto).not.toContain('ocupação');
    expect(texto).not.toContain('fator');
    expect(texto).not.toContain('cubado');
    expect(texto).not.toContain('gg');
    expect(texto).not.toContain('fechou');
  });

  it.each([
    ['dados insuficientes', [{ row: LINHA_SEM_PESO, quantity: 1 }]],
    ['não cabe', [{ row: LINHA_BARRA_61, quantity: 1 }]],
    ['sem itens', []],
  ])('plano %s: texto vazio', (_nome, inputs) => {
    const plan = planFreight(inputs, CAIXAS_PADRAO, OPCOES, SETTINGS_PADRAO);

    expect(formatPlanForClient(plan)).toBe('');
  });
});
