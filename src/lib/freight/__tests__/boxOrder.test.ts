/**
 * boxOrder.test.ts — volume interno e as ordens derivadas dele.
 */
import { describe, expect, it } from 'vitest';

import { daMaiorParaMenor, daMenorParaMaior, maiorCaixa, volumeInternoCm3 } from '../boxOrder';
import { CAIXAS_PADRAO, CAIXA_G, CAIXA_GG, CAIXA_M, CAIXA_P } from './fixtures/boxes';

describe('boxOrder', () => {
  it('volume interno das quatro caixas padrão', () => {
    // P 26,4 × 32,4 × 32,4 · M 32,4 × 32,4 × 46,4
    // G 35,4 × 35,4 × 53,4 · GG 39,4 × 49,4 × 59,4
    expect(volumeInternoCm3(CAIXA_P)).toBeCloseTo(27_713.664, 3);
    expect(volumeInternoCm3(CAIXA_M)).toBeCloseTo(48_708.864, 3);
    expect(volumeInternoCm3(CAIXA_G)).toBeCloseTo(66_918.744, 3);
    expect(volumeInternoCm3(CAIXA_GG)).toBeCloseTo(115_613.784, 3);
  });

  it('ordena da maior para a menor e o inverso', () => {
    expect(daMaiorParaMenor(CAIXAS_PADRAO).map((c) => c.code)).toEqual(['GG', 'G', 'M', 'P']);
    expect(daMenorParaMaior(CAIXAS_PADRAO).map((c) => c.code)).toEqual(['P', 'M', 'G', 'GG']);
  });

  it('não altera a lista recebida', () => {
    const original = CAIXAS_PADRAO.map((c) => c.code);
    daMaiorParaMenor(CAIXAS_PADRAO);
    daMenorParaMaior(CAIXAS_PADRAO);
    expect(CAIXAS_PADRAO.map((c) => c.code)).toEqual(original);
  });

  it('empate de volume desempata pelo código, para a ordem ser estável', () => {
    // duas caixas de mesmo volume interno: sem desempate, a ordem dependeria
    // da implementação do sort e o plano salvo deixaria de ser comparável
    const gemeaB = { ...CAIXA_P, id: 'gemea-b', code: 'ZZ' };
    const gemeaA = { ...CAIXA_P, id: 'gemea-a', code: 'AA' };

    expect(daMaiorParaMenor([gemeaB, gemeaA]).map((c) => c.code)).toEqual(['AA', 'ZZ']);
    expect(daMaiorParaMenor([gemeaA, gemeaB]).map((c) => c.code)).toEqual(['AA', 'ZZ']);
  });

  it('maiorCaixa devolve a GG, e null quando não há caixa', () => {
    expect(maiorCaixa(CAIXAS_PADRAO)?.code).toBe('GG');
    expect(maiorCaixa([])).toBeNull();
  });
});
