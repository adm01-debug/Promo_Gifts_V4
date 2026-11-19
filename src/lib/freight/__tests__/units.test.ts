/**
 * units.test.ts — conversão de unidades do motor de frete.
 *
 * Cobertura alvo: 100% das linhas de `units.ts`. Cada conversor é exercitado
 * no caminho válido, no zero, no negativo e no não-finito.
 */
import { describe, expect, it } from 'vitest';

import { cm3ToM3, isKnownMeasure, kgToG, mmToCm, round1, round2 } from '../units';

describe('mmToCm', () => {
  it('converte milímetro em centímetro', () => {
    // 125 mm / 10 = 12,5 cm
    expect(mmToCm(125)).toBe(12.5);
    // 380 mm / 10 = 38 cm (lado da caixa master da garrafa 54601)
    expect(mmToCm(380)).toBe(38);
  });

  it('não arrasta erro de ponto flutuante', () => {
    // 383 / 10 = 38,3 — sem arredondamento vazaria 38.300000000000004
    expect(mmToCm(383)).toBe(38.3);
  });

  it('zero converte para zero: quem decide que zero é ausência é isKnownMeasure', () => {
    expect(mmToCm(0)).toBe(0);
  });

  it('recusa negativo e não-finito', () => {
    expect(mmToCm(-1)).toBeNull();
    expect(mmToCm(Number.NaN)).toBeNull();
    expect(mmToCm(Number.POSITIVE_INFINITY)).toBeNull();
    expect(mmToCm(null)).toBeNull();
    expect(mmToCm(undefined)).toBeNull();
  });
});

describe('kgToG', () => {
  it('converte quilograma em grama', () => {
    // 0,35 kg × 1000 = 350 g — em float puro daria 350.00000000000006
    expect(kgToG(0.35)).toBe(350);
    // 5,5 kg × 1000 = 5500 g (box_weight_kg da garrafa 54601)
    expect(kgToG(5.5)).toBe(5500);
    // 1,183 kg × 1000 = 1183 g (box_weight_kg do kit KT-9059K)
    expect(kgToG(1.183)).toBe(1183);
  });

  it('zero converte para zero', () => {
    expect(kgToG(0)).toBe(0);
  });

  it('recusa negativo e não-finito', () => {
    expect(kgToG(Number.NaN)).toBeNull();
    expect(kgToG(-0.5)).toBeNull();
    expect(kgToG(null)).toBeNull();
    expect(kgToG(undefined)).toBeNull();
    expect(kgToG(Number.NEGATIVE_INFINITY)).toBeNull();
  });
});

describe('cm3ToM3', () => {
  it('converte centímetro cúbico em metro cúbico', () => {
    // 1.000.000 cm³ = 1 m³
    expect(cm3ToM3(1_000_000)).toBe(1);
    // caixa G externa 36 × 36 × 54 = 69.984 cm³ = 0,069984 m³
    expect(cm3ToM3(69_984)).toBeCloseTo(0.069984, 6);
  });

  it('zero converte para zero', () => {
    expect(cm3ToM3(0)).toBe(0);
  });

  it('recusa negativo e não-finito', () => {
    expect(cm3ToM3(-10)).toBeNull();
    expect(cm3ToM3(Number.NaN)).toBeNull();
    expect(cm3ToM3(null)).toBeNull();
    expect(cm3ToM3(undefined)).toBeNull();
  });
});

describe('round1', () => {
  it('arredonda para uma casa decimal', () => {
    // 18.449 → 18,4 kg (resumo de plano "18,4 kg")
    expect(round1(18.449)).toBe(18.4);
    expect(round1(18.45)).toBe(18.5);
    expect(round1(12)).toBe(12);
    expect(round1(0)).toBe(0);
  });

  it('recusa negativo e não-finito', () => {
    expect(round1(-1.2)).toBeNull();
    expect(round1(Number.NaN)).toBeNull();
    expect(round1(null)).toBeNull();
    expect(round1(undefined)).toBeNull();
  });
});

describe('round2', () => {
  it('arredonda para duas casas decimais', () => {
    // 0.2099 → 0,21 m³ (resumo de plano "0,21 m³")
    expect(round2(0.2099)).toBe(0.21);
    expect(round2(0.214)).toBe(0.21);
    expect(round2(3)).toBe(3);
    expect(round2(0)).toBe(0);
  });

  it('recusa negativo e não-finito', () => {
    expect(round2(-0.01)).toBeNull();
    expect(round2(Number.NaN)).toBeNull();
    expect(round2(null)).toBeNull();
    expect(round2(undefined)).toBeNull();
  });
});

describe('isKnownMeasure', () => {
  it('aceita medida finita maior que zero', () => {
    expect(isKnownMeasure(12)).toBe(true);
    expect(isKnownMeasure(0.1)).toBe(true);
  });

  it('rejeita zero — o catálogo usa zero como ausência de dado', () => {
    expect(isKnownMeasure(0)).toBe(false);
  });

  it('rejeita null, undefined, negativo e não-finito', () => {
    expect(isKnownMeasure(null)).toBe(false);
    expect(isKnownMeasure(undefined)).toBe(false);
    expect(isKnownMeasure(-3)).toBe(false);
    expect(isKnownMeasure(Number.NaN)).toBe(false);
    expect(isKnownMeasure(Number.POSITIVE_INFINITY)).toBe(false);
  });
});
