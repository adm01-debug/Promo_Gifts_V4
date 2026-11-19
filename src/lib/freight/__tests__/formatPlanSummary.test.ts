/**
 * formatPlanSummary.test.ts — o resumo de uma linha.
 */
import { describe, expect, it } from 'vitest';

import { formatPlanSummary } from '../formatPlanSummary';
import { planFreight, type PlanOptions } from '../planFreight';
import { CAIXAS_PADRAO, CAIXA_G, CAIXA_M, CAIXA_P, SETTINGS_PADRAO } from './fixtures/boxes';
import { LINHA_BARRA_61, LINHA_CADERNETA } from './fixtures/items';

const OPCOES: PlanOptions = {
  mixMode: 'misturar',
  computedAt: '2026-11-19T12:00:00.000Z',
  itemsHash: 'hash-de-teste',
};

describe('formatPlanSummary', () => {
  it('460 cadernetas em P/M/G: caixas da maior para a menor, números em pt-BR', () => {
    // 3× G + 1× P
    // peso bruto 55.200 g = 55,2 kg
    // volume 239.355 cm³ = 0,24 m³
    // cubado Correios 39.892,50 g = 39,9 kg
    const plan = planFreight(
      [{ row: LINHA_CADERNETA, quantity: 460 }],
      [CAIXA_P, CAIXA_M, CAIXA_G],
      OPCOES,
      SETTINGS_PADRAO,
    );

    expect(formatPlanSummary(plan)).toBe('3× G + 1× P · 55,2 kg · 0,24 m³ · cubado 39,9 kg');
  });

  it('250 cadernetas nas quatro caixas: uma GG só', () => {
    // 1× GG · 250 × 120 = 30.000 g = 30,0 kg
    // externa 40 × 50 × 60 = 120.000 cm³ = 0,12 m³
    // cubado Correios 120.000 ÷ 6.000 × 1.000 = 20.000 g = 20,0 kg
    const plan = planFreight(
      [{ row: LINHA_CADERNETA, quantity: 250 }],
      CAIXAS_PADRAO,
      OPCOES,
      SETTINGS_PADRAO,
    );

    expect(formatPlanSummary(plan)).toBe('1× GG · 30,0 kg · 0,12 m³ · cubado 20,0 kg');
  });

  it('caixas de mesmo volume saem em ordem de código', () => {
    // duas caixas de volume interno igual: o resumo precisa de ordem estável
    const gemeaZ = { ...CAIXA_P, id: 'gemea-z', code: 'ZZ' };
    const gemeaA = { ...CAIXA_P, id: 'gemea-a', code: 'AA' };
    const plan = planFreight(
      [{ row: LINHA_CADERNETA, quantity: 100 }],
      [gemeaZ, gemeaA],
      OPCOES,
      SETTINGS_PADRAO,
    );

    // 100 cadernetas, capacidade 64 em cada: nenhuma fecha sozinha, então
    // abre uma cheia da "maior" (AA, por desempate de código) com 64 e fecha
    // os 36 restantes na outra (ZZ).
    // peso 100 × 120 = 12.000 g = 12,0 kg
    // volume 2 × 29.403 = 58.806 cm³ = 0,058806 m³ → 0,06
    // cubado Correios 2 × 4.900,50 = 9.801 g = 9,8 kg
    // AA aparece antes de ZZ: é o desempate por código no resumo.
    expect(plan.status).toBe('ok');
    expect(formatPlanSummary(plan)).toBe('1× AA + 1× ZZ · 12,0 kg · 0,06 m³ · cubado 9,8 kg');
  });

  it('plano bloqueado não tem resumo', () => {
    const naoCabe = planFreight(
      [{ row: LINHA_BARRA_61, quantity: 1 }],
      CAIXAS_PADRAO,
      OPCOES,
      SETTINGS_PADRAO,
    );
    expect(formatPlanSummary(naoCabe)).toBe('');

    const vazio = planFreight([], CAIXAS_PADRAO, OPCOES, SETTINGS_PADRAO);
    expect(formatPlanSummary(vazio)).toBe('');
  });
});
