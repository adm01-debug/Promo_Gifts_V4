/**
 * fitCount.test.ts — capacidade de uma caixa para uma peça.
 *
 * Todo valor esperado está calculado à mão no comentário do caso, com as
 * caixas reais da empresa (ver `fixtures/boxes.ts`). Internas:
 * P 26,4 × 32,4 × 32,4 · M 32,4 × 32,4 × 46,4 · G 35,4 × 35,4 × 53,4 ·
 * GG 39,4 × 49,4 × 59,4. Fator 0,9 em todas.
 */
import { describe, expect, it } from 'vitest';

import { fitCount, type FittableItem } from '../fitCount';
import {
  CAIXAS_PADRAO,
  CAIXA_G,
  CAIXA_GG,
  CAIXA_M,
  CAIXA_P,
  SETTINGS_PADRAO,
} from './fixtures/boxes';

function peca(heightCm: number, widthCm: number, lengthCm: number, weightG: number): FittableItem {
  return { dims: { heightCm, widthCm, lengthCm }, weightG };
}

/** Caderneta 21 × 14 × 1 cm, 120 g. Volume 294 cm³. */
const CADERNETA = peca(21, 14, 1, 120);
/** Squeeze 25 × 7 × 7 cm, 80 g. Volume 1.225 cm³. */
const SQUEEZE = peca(25, 7, 7, 80);
/** Cubo denso 10 × 10 × 10 cm, 1 kg. Volume 1.000 cm³. */
const CUBO_1KG = peca(10, 10, 10, 1000);
/** Barra de 50 cm: 50 × 10 × 10, 500 g. Volume 5.000 cm³. */
const BARRA_50 = peca(50, 10, 10, 500);
/** Barra de 61 cm: mais comprida que o maior lado interno (GG, 59,4 cm). */
const BARRA_61 = peca(61, 10, 10, 500);
/** Suporte para garrafas real (SKU 34702): 12 × 31,6 × 1,2 cm, 1 g. */
const SUPORTE = peca(12, 31.6, 1.2, 1);

describe('fitCount — caderneta 21 × 14 × 1 cm, 120 g', () => {
  it('P: geometria manda, 64 unidades', () => {
    // melhor orientação (21,14,1) → ⌊26,4/21⌋=1 · ⌊32,4/14⌋=2 · ⌊32,4/1⌋=32 = 64
    // volume: 27.713,664 × 0,9 = 24.942,2976 ÷ 294 = 84,83 → 84
    // peso:   10.000 ÷ 120 = 83,33 → 83
    const r = fitCount(CADERNETA, CAIXA_P, SETTINGS_PADRAO);
    expect(r).toMatchObject({
      capacity: 64,
      limitedBy: 'geometry',
      byGeometry: 64,
      byVolume: 84,
      byWeight: 83,
    });
  });

  it('M: geometria manda, 128 unidades', () => {
    // melhor orientação (14,1,21) → ⌊32,4/14⌋=2 · ⌊32,4/1⌋=32 · ⌊46,4/21⌋=2 = 128
    // volume: 48.708,864 × 0,9 = 43.837,9776 ÷ 294 = 149,1 → 149
    // peso:   20.000 ÷ 120 = 166,67 → 166
    const r = fitCount(CADERNETA, CAIXA_M, SETTINGS_PADRAO);
    expect(r).toMatchObject({
      capacity: 128,
      limitedBy: 'geometry',
      byGeometry: 128,
      byVolume: 149,
      byWeight: 166,
    });
  });

  it('G: geometria manda, 140 unidades', () => {
    // melhor orientação (14,1,21) → ⌊35,4/14⌋=2 · ⌊35,4/1⌋=35 · ⌊53,4/21⌋=2 = 140
    // volume: 66.918,744 × 0,9 = 60.226,8696 ÷ 294 = 204,85 → 204
    // peso:   25.000 ÷ 120 = 208,33 → 208
    const r = fitCount(CADERNETA, CAIXA_G, SETTINGS_PADRAO);
    expect(r).toMatchObject({
      capacity: 140,
      limitedBy: 'geometry',
      byGeometry: 140,
      byVolume: 204,
      byWeight: 208,
    });
  });

  it('GG: o peso máximo manda antes da geometria, 250 unidades', () => {
    // melhor orientação (1,21,14) → ⌊39,4/1⌋=39 · ⌊49,4/21⌋=2 · ⌊59,4/14⌋=4 = 312
    // volume: 115.613,784 × 0,9 = 104.052,4056 ÷ 294 = 353,9 → 353
    // peso:   30.000 ÷ 120 = 250 exato → 250  ← o menor dos três
    const r = fitCount(CADERNETA, CAIXA_GG, SETTINGS_PADRAO);
    expect(r).toMatchObject({
      capacity: 250,
      limitedBy: 'weight',
      byGeometry: 312,
      byVolume: 353,
      byWeight: 250,
    });
  });
});

describe('fitCount — outras peças', () => {
  it('squeeze 25 × 7 × 7 na P: 16 unidades por geometria', () => {
    // orientação (25,7,7) → ⌊26,4/25⌋=1 · ⌊32,4/7⌋=4 · ⌊32,4/7⌋=4 = 16
    // volume: 24.942,2976 ÷ 1.225 = 20,36 → 20 · peso: 10.000 ÷ 80 = 125
    const r = fitCount(SQUEEZE, CAIXA_P, SETTINGS_PADRAO);
    expect(r).toMatchObject({
      capacity: 16,
      limitedBy: 'geometry',
      byGeometry: 16,
      byVolume: 20,
      byWeight: 125,
    });
  });

  it('cubo de 1 kg na P: o peso corta em 10 antes da geometria', () => {
    // geometria: ⌊26,4/10⌋=2 · ⌊32,4/10⌋=3 · ⌊32,4/10⌋=3 = 18 (igual nas 6)
    // volume: 24.942,2976 ÷ 1.000 = 24,94 → 24 · peso: 10.000 ÷ 1.000 = 10
    const r = fitCount(CUBO_1KG, CAIXA_P, SETTINGS_PADRAO);
    expect(r).toMatchObject({
      capacity: 10,
      limitedBy: 'weight',
      byGeometry: 18,
      byVolume: 24,
      byWeight: 10,
    });
  });

  it('barra de 50 cm não entra na P nem na M, e entra deitada na G e na GG', () => {
    // P: maior lado interno 32,4 < 50 → nenhuma orientação cabe
    // M: maior lado interno 46,4 < 50 → nenhuma orientação cabe
    expect(fitCount(BARRA_50, CAIXA_P, SETTINGS_PADRAO)).toMatchObject({
      capacity: 0,
      byGeometry: 0,
      orientation: null,
    });
    expect(fitCount(BARRA_50, CAIXA_M, SETTINGS_PADRAO)).toMatchObject({
      capacity: 0,
      byGeometry: 0,
    });

    // G: só com o 50 no comprimento (53,4) → ⌊35,4/10⌋=3 · ⌊35,4/10⌋=3 · ⌊53,4/50⌋=1 = 9
    //    volume: 60.226,8696 ÷ 5.000 = 12,04 → 12 · peso: 25.000 ÷ 500 = 50
    expect(fitCount(BARRA_50, CAIXA_G, SETTINGS_PADRAO)).toMatchObject({
      capacity: 9,
      limitedBy: 'geometry',
      byGeometry: 9,
      byVolume: 12,
      byWeight: 50,
      orientation: { heightCm: 10, widthCm: 10, lengthCm: 50 },
    });

    // GG: ⌊39,4/10⌋=3 · ⌊49,4/10⌋=4 · ⌊59,4/50⌋=1 = 12
    //     volume: 104.052,4056 ÷ 5.000 = 20,81 → 20 · peso: 30.000 ÷ 500 = 60
    expect(fitCount(BARRA_50, CAIXA_GG, SETTINGS_PADRAO)).toMatchObject({
      capacity: 12,
      limitedBy: 'geometry',
      byGeometry: 12,
      byVolume: 20,
      byWeight: 60,
    });
  });

  it('barra de 61 cm não entra em nenhuma caixa ativa', () => {
    // o maior lado interno do catálogo é o comprimento da GG, 59,4 cm
    for (const caixa of CAIXAS_PADRAO) {
      const r = fitCount(BARRA_61, caixa, SETTINGS_PADRAO);
      expect(r.capacity, `caixa ${caixa.code}`).toBe(0);
      expect(r.orientation, `caixa ${caixa.code}`).toBeNull();
    }
  });

  it('suporte de 1,2 cm (SKU 34702) na P: 27 fileiras, 54 unidades', () => {
    // 32,4 ÷ 1,2 em float dá 27 exato: este caso não depende da tolerância do
    // piso (quem depende é o caso seguinte, 26,4 ÷ 4,4).
    // (12, 1,2, 31,6) → ⌊26,4/12⌋=2 · ⌊32,4/1,2⌋=27 · ⌊32,4/31,6⌋=1 = 54
    // volume: 24.942,2976 ÷ 455,04 = 54,81 → 54 (empata com a geometria)
    // peso:   10.000 ÷ 1 = 10.000
    const r = fitCount(SUPORTE, CAIXA_P, SETTINGS_PADRAO);
    expect(r.byGeometry).toBe(54);
    expect(r).toMatchObject({
      capacity: 54,
      limitedBy: 'geometry',
      byVolume: 54,
      byWeight: 10_000,
    });
  });

  it('peça de 4,4 cm não perde camada por erro de ponto flutuante', () => {
    // 26,4 ÷ 4,4 = 6, mas em float sai 5,999999999999999: sem a tolerância do
    // piso viram 5 camadas e a capacidade cai de 54 para 45.
    // (4,4, 10, 10) → ⌊26,4/4,4⌋=6 · ⌊32,4/10⌋=3 · ⌊32,4/10⌋=3 = 54
    // (10, 4,4, 10) → ⌊26,4/10⌋=2 · ⌊32,4/4,4⌋=7 · ⌊32,4/10⌋=3 = 42
    // volume: 24.942,2976 ÷ 440 = 56,69 → 56
    // peso:   10.000 ÷ 100 = 100
    const r = fitCount(peca(4.4, 10, 10, 100), CAIXA_P, SETTINGS_PADRAO);
    expect(r).toMatchObject({
      capacity: 54,
      limitedBy: 'geometry',
      byGeometry: 54,
      byVolume: 56,
      byWeight: 100,
    });
  });

  // A peça 39 × 49 × 59 cm só entra na GG (39,4 × 49,4 × 59,4) com cada lado
  // no eixo certo: ⌊39,4/39⌋ · ⌊49,4/49⌋ · ⌊59,4/59⌋ = 1. Qualquer outra
  // permutação põe um lado maior que o eixo da caixa e zera. O cadastro pode
  // trazer os lados em qualquer ordem, então as 6 permutações têm de achar a
  // mesma orientação — cada linha abaixo depende de uma rotação diferente.
  it.each([
    [39, 49, 59],
    [39, 59, 49],
    [49, 39, 59],
    [49, 59, 39],
    [59, 39, 49],
    [59, 49, 39],
  ])('peça cadastrada como %d × %d × %d entra na GG girada para 39 × 49 × 59', (h, w, l) => {
    // volume: 104.052,4056 ÷ 112.749 = 0,92 → 0, piso de 1 para a peça sozinha
    // peso:   30.000 ÷ 500 = 60
    const r = fitCount(peca(h, w, l, 500), CAIXA_GG, SETTINGS_PADRAO);
    expect(r).toMatchObject({
      capacity: 1,
      limitedBy: 'geometry',
      byGeometry: 1,
      byVolume: 1,
      byWeight: 60,
      orientation: { heightCm: 39, widthCm: 49, lengthCm: 59 },
    });
  });
});

describe('fitCount — fator de aproveitamento da própria caixa', () => {
  // Cubo de 10 cm na G (35,4 × 35,4 × 53,4 = 66.918,744 cm³):
  // geometria ⌊35,4/10⌋=3 · ⌊35,4/10⌋=3 · ⌊53,4/10⌋=5 = 45 em qualquer fator.

  it('caixa com fator 0,50 usa o dela, não o padrão global de 0,90', () => {
    // volume: 66.918,744 × 0,5 = 33.459,372 ÷ 1.000 = 33,46 → 33
    // (com o padrão 0,9 seriam 60 e a geometria mandaria com 45)
    // peso:   25.000 ÷ 1 = 25.000
    const g50 = { ...CAIXA_G, fillFactor: 0.5 };
    const r = fitCount(peca(10, 10, 10, 1), g50, SETTINGS_PADRAO);
    expect(r).toMatchObject({
      capacity: 33,
      limitedBy: 'volume',
      byGeometry: 45,
      byVolume: 33,
      byWeight: 25_000,
    });
  });

  it('volume uma unidade abaixo da geometria: quem limita é o volume', () => {
    // volume: 66.918,744 × 0,66 = 44.166,37 ÷ 1.000 = 44,17 → 44 (geometria 45)
    const g66 = { ...CAIXA_G, fillFactor: 0.66 };
    const r = fitCount(peca(10, 10, 10, 1), g66, SETTINGS_PADRAO);
    expect(r).toMatchObject({ capacity: 44, limitedBy: 'volume', byGeometry: 45, byVolume: 44 });
  });

  it('empate entre volume e peso: a ordem documentada é volume antes de peso', () => {
    // volume: 44 (caso acima) · peso: 25.000 ÷ 560 = 44,64 → 44
    const g66 = { ...CAIXA_G, fillFactor: 0.66 };
    const r = fitCount(peca(10, 10, 10, 560), g66, SETTINGS_PADRAO);
    expect(r).toMatchObject({ capacity: 44, limitedBy: 'volume', byVolume: 44, byWeight: 44 });
  });
});

describe('fitCount — entradas degeneradas', () => {
  it('lado desconhecido zera a capacidade', () => {
    const r = fitCount(peca(0, 10, 10, 100), CAIXA_G, SETTINGS_PADRAO);
    expect(r).toMatchObject({ capacity: 0, byGeometry: 0, byVolume: 0, orientation: null });
  });

  it('peso não cadastrado não cria teto de peso', () => {
    // `resolveItemDimensions` bloqueia esse produto antes; se chegar, o único
    // teto que vale é o físico — inventar um limite de peso seria pior.
    const r = fitCount(peca(10, 10, 10, 0), CAIXA_P, SETTINGS_PADRAO);
    expect(r.byWeight).toBe(Number.POSITIVE_INFINITY);
    expect(r).toMatchObject({ capacity: 18, limitedBy: 'geometry' });
  });

  it('peça que entra pela geometria e zera pelo peso não devolve orientação', () => {
    // cubo de 10 cm na GG: ⌊39,4/10⌋=3 · ⌊49,4/10⌋=4 · ⌊59,4/10⌋=5 = 60
    // volume: 104.052,4056 ÷ 1.000 = 104 · peso: 30.000 ÷ 30.001 = 0,99 → 0
    const r = fitCount(peca(10, 10, 10, 30_001), CAIXA_GG, SETTINGS_PADRAO);
    expect(r).toMatchObject({
      capacity: 0,
      limitedBy: 'weight',
      byGeometry: 60,
      byVolume: 104,
      byWeight: 0,
      orientation: null,
    });
  });

  it('caixa sem peso útil zera por peso', () => {
    const caixaRuim = { ...CAIXA_P, emptyWeightG: 10_000 };
    const r = fitCount(CUBO_1KG, caixaRuim, SETTINGS_PADRAO);
    expect(r).toMatchObject({ capacity: 0, limitedBy: 'weight', byWeight: 0 });
  });

  it('peça única que entra na caixa não é recusada pelo fator de aproveitamento', () => {
    // 39 × 49 × 59 cm na GG (39,4 × 49,4 × 59,4): ⌊39,4/39⌋ · ⌊49,4/49⌋ · ⌊59,4/59⌋ = 1
    // volume: 104.052,4056 ÷ 112.749 = 0,92 → 0, mas uma peça sozinha não
    //         perde espaço entre peças: o piso é 1
    // peso:   30.000 ÷ 5.000 = 6
    const r = fitCount(peca(39, 49, 59, 5000), CAIXA_GG, SETTINGS_PADRAO);
    expect(r).toMatchObject({
      capacity: 1,
      limitedBy: 'geometry',
      byGeometry: 1,
      byVolume: 1,
      byWeight: 6,
    });
  });

  it('o piso de 1 não vale para peça que não entra na caixa', () => {
    // a mesma peça na G (35,4 × 35,4 × 53,4): 59 > 53,4, nenhuma orientação cabe
    // volume: 60.226,8696 ÷ 112.749 = 0,53 → 0, e continua 0
    const r = fitCount(peca(39, 49, 59, 5000), CAIXA_G, SETTINGS_PADRAO);
    expect(r).toMatchObject({ capacity: 0, byGeometry: 0, byVolume: 0 });
  });

  it('fator da caixa fora do intervalo cai no padrão global', () => {
    // fillFactor 0 não é "sem aproveitamento": é ausência de cadastro, e o
    // padrão global (0,9) assume o lugar.
    const semFator = { ...CAIXA_P, fillFactor: 0 };
    expect(fitCount(CADERNETA, semFator, SETTINGS_PADRAO).byVolume).toBe(84);

    const fatorAbsurdo = { ...CAIXA_P, fillFactor: 2 };
    expect(fitCount(CADERNETA, fatorAbsurdo, SETTINGS_PADRAO).byVolume).toBe(84);
  });
});
