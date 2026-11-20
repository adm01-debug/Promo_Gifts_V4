/**
 * packSingleProduct.test.ts — um produto, N unidades, nas 4 caixas padrão.
 *
 * Capacidades (de `fitCount.test.ts`):
 * caderneta → P 64 · M 128 · G 140 · GG 250
 * squeeze   → P 16 · M  24 · G  49 · GG  70
 */
import { describe, expect, it } from 'vitest';

import { packSingleProduct } from '../packSingleProduct';
import {
  CAIXAS_PADRAO,
  CAIXA_G,
  CAIXA_GG,
  CAIXA_M,
  CAIXA_P,
  SETTINGS_PADRAO,
} from './fixtures/boxes';
import { barraGigante, caderneta, pecaDeTeste, squeeze } from './fixtures/items';

/** "2× GG + 1× M", da maior caixa para a menor. */
function forma(volumes: Array<{ box: { code: string } }>): string {
  const porCodigo = new Map<string, number>();
  for (const v of volumes) porCodigo.set(v.box.code, (porCodigo.get(v.box.code) ?? 0) + 1);
  const ordem = ['GG', 'G', 'M', 'P'];
  return ordem
    .filter((code) => porCodigo.has(code))
    .map((code) => `${porCodigo.get(code)}× ${code}`)
    .join(' + ');
}

function total(volumes: Array<{ contents: Array<{ quantity: number }> }>): number {
  return volumes.reduce((soma, v) => soma + v.contents.reduce((s, c) => s + c.quantity, 0), 0);
}

describe('packSingleProduct — caderneta', () => {
  it('7 unidades: a menor caixa que fecha é a P (cabem 64)', () => {
    const r = packSingleProduct(caderneta(7), CAIXAS_PADRAO, SETTINGS_PADRAO);

    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(forma(r.volumes)).toBe('1× P');
    expect(total(r.volumes)).toBe(7);
  });

  it('100 unidades: a P não fecha (64), a M fecha (128)', () => {
    const r = packSingleProduct(caderneta(100), CAIXAS_PADRAO, SETTINGS_PADRAO);

    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(forma(r.volumes)).toBe('1× M');
    expect(total(r.volumes)).toBe(100);
  });

  it('250 unidades: a GG fecha exatamente no peso máximo', () => {
    // capacidade da GG é 250 por peso (30.000 g ÷ 120 g), não por espaço
    const r = packSingleProduct(caderneta(250), CAIXAS_PADRAO, SETTINGS_PADRAO);

    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(forma(r.volumes)).toBe('1× GG');
    expect(total(r.volumes)).toBe(250);
  });

  it('600 unidades: duas GG cheias e o resto na menor que fecha', () => {
    // 600 ≥ 250 → GG cheia (350 restam) · 350 ≥ 250 → GG cheia (100 restam)
    // 100 < 250 → menor caixa com capacidade ≥ 100 é a M (128)
    const r = packSingleProduct(caderneta(600), CAIXAS_PADRAO, SETTINGS_PADRAO);

    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(forma(r.volumes)).toBe('2× GG + 1× M');
    expect(total(r.volumes)).toBe(600);
  });

  it('460 unidades sem a GG no catálogo: 3 G cheias e uma P', () => {
    // só P, M, G ativas → a maior é a G (140)
    // 460 → G (320) → G (180) → G (40) → menor que fecha 40 é a P (64)
    const r = packSingleProduct(caderneta(460), [CAIXA_P, CAIXA_M, CAIXA_G], SETTINGS_PADRAO);

    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(forma(r.volumes)).toBe('3× G + 1× P');
    expect(total(r.volumes)).toBe(460);
  });
});

describe('packSingleProduct — squeeze', () => {
  it('7 unidades: 1× P (cabem 16)', () => {
    const r = packSingleProduct(squeeze(7), CAIXAS_PADRAO, SETTINGS_PADRAO);
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(forma(r.volumes)).toBe('1× P');
  });

  it('100 unidades: nenhuma caixa fecha sozinha, abre GG cheia e fecha na G', () => {
    // 100 > 70 (GG) → GG cheia com 70, restam 30 → menor com capacidade ≥ 30 é a G (49)
    const r = packSingleProduct(squeeze(100), CAIXAS_PADRAO, SETTINGS_PADRAO);

    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(forma(r.volumes)).toBe('1× GG + 1× G');
    expect(total(r.volumes)).toBe(100);
  });

  it('250 unidades: três GG cheias e uma G', () => {
    // 250 → GG 70 (180) → GG 70 (110) → GG 70 (40) → G fecha 40 (capacidade 49)
    const r = packSingleProduct(squeeze(250), CAIXAS_PADRAO, SETTINGS_PADRAO);

    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(forma(r.volumes)).toBe('3× GG + 1× G');
    expect(total(r.volumes)).toBe(250);
  });
});

describe('packSingleProduct — limites', () => {
  it('peça maior que a maior caixa devolve nao_cabe', () => {
    const r = packSingleProduct(barraGigante(1), CAIXAS_PADRAO, SETTINGS_PADRAO);

    expect(r.status).toBe('nao_cabe');
    if (r.status !== 'nao_cabe') return;
    expect(r.item.sku).toBe('SKU-barra-61');
  });

  it('sem caixa ativa devolve nao_cabe', () => {
    const r = packSingleProduct(caderneta(10), [], SETTINGS_PADRAO);
    expect(r.status).toBe('nao_cabe');
  });

  it('quantidade zero não abre caixa', () => {
    const r = packSingleProduct(caderneta(0), CAIXAS_PADRAO, SETTINGS_PADRAO);
    expect(r).toEqual({ status: 'ok', volumes: [] });
  });

  it('nenhum volume passa do peso máximo da própria caixa', () => {
    for (const quantidade of [7, 100, 250, 460, 600, 1000]) {
      const r = packSingleProduct(caderneta(quantidade), CAIXAS_PADRAO, SETTINGS_PADRAO);
      expect(r.status).toBe('ok');
      if (r.status !== 'ok') continue;
      for (const volume of r.volumes) {
        const pesoG = volume.contents.reduce((s, c) => s + c.item.weightG * c.quantity, 0);
        expect(pesoG, `${quantidade} un. na ${volume.box.code}`).toBeLessThanOrEqual(
          volume.box.maxWeightG - volume.box.emptyWeightG,
        );
      }
    }
  });
});

describe('packSingleProduct — caixas cheias de uma vez e teto de volumes', () => {
  it('1.000.000 de cadernetas: 4.000 GG, cada volume um objeto próprio', () => {
    // cheias = ⌈(1.000.000 − 250) ÷ 250⌉ = ⌈3.999⌉ = 3.999
    // sobram 1.000.000 − 3.999 × 250 = 250 → a GG fecha (cabem 250)
    const r = packSingleProduct(caderneta(1_000_000), CAIXAS_PADRAO, SETTINGS_PADRAO);

    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(forma(r.volumes)).toBe('4000× GG');
    expect(total(r.volumes)).toBe(1_000_000);
    // os volumes iguais não dividem objeto: mexer num não mexe no vizinho
    expect(r.volumes[0]).not.toBe(r.volumes[1]);
    expect(r.volumes[0].contents).not.toBe(r.volumes[1].contents);
    expect(r.volumes[0].contents[0]).not.toBe(r.volumes[1].contents[0]);
  });

  it('exatamente 10.000 volumes passam; 10.001 voltam só com a contagem', () => {
    // 2.500.000 ÷ 250 = 10.000 GG
    const noTeto = packSingleProduct(caderneta(2_500_000), CAIXAS_PADRAO, SETTINGS_PADRAO);
    expect(noTeto.status).toBe('ok');
    if (noTeto.status !== 'ok') return;
    expect(noTeto.volumes).toHaveLength(10_000);

    // 2.500.250: cheias = ⌈(2.500.250 − 250) ÷ 250⌉ = 10.000; sobram 250 → +1
    const acima = packSingleProduct(caderneta(2_500_250), CAIXAS_PADRAO, SETTINGS_PADRAO);
    expect(acima).toEqual({ status: 'volumes_demais', quantos: 10_001 });
  });

  it('o teto é o que quem chama passar: 600 cadernetas são 3 volumes', () => {
    // 2 GG cheias + 1 M (caso "600 unidades" acima)
    expect(packSingleProduct(caderneta(600), CAIXAS_PADRAO, SETTINGS_PADRAO, 2)).toEqual({
      status: 'volumes_demais',
      quantos: 3,
    });
    const r = packSingleProduct(caderneta(600), CAIXAS_PADRAO, SETTINGS_PADRAO, 3);
    expect(r.status).toBe('ok');
  });

  it('Number.MAX_SAFE_INTEGER: conta as caixas sem montar nenhuma', () => {
    // cheias = ⌈(9.007.199.254.740.991 − 250) ÷ 250⌉ = 36.028.797.018.963
    // sobram 241 → mais uma GG → 36.028.797.018.964
    const r = packSingleProduct(caderneta(Number.MAX_SAFE_INTEGER), CAIXAS_PADRAO, SETTINGS_PADRAO);
    expect(r).toEqual({ status: 'volumes_demais', quantos: 36_028_797_018_964 });
  });

  it('quantidade infinita não vira "zero volume": também para no teto', () => {
    const r = packSingleProduct(
      caderneta(Number.POSITIVE_INFINITY),
      CAIXAS_PADRAO,
      SETTINGS_PADRAO,
    );
    expect(r.status).toBe('volumes_demais');
  });

  it('a caixa menor leva mais unidades que a maior: a conta usa a maior capacidade', () => {
    // peça 10 × 10 × 10 cm, 1 kg. Caixa "larga" (40 cm de lado por dentro, até
    // 5 kg): 5 por peso. Caixa "forte" (30 cm de lado por dentro, até 20 kg):
    // grade 3 · 3 · 3 = 27, volume ⌊27.000 × 0,9 ÷ 1.000⌋ = 24, peso 20 → 20.
    // A maior por espaço é a larga (5 por caixa), mas a forte fecha até 20.
    // 31 peças: cheias = ⌈(31 − 20) ÷ 5⌉ = ⌈2,2⌉ = 3 largas (15 peças);
    //           sobram 16 → forte (cabem 20)
    const larga = {
      ...CAIXA_G,
      id: 'larga',
      code: 'LARGA',
      inner: { heightCm: 40, widthCm: 40, lengthCm: 40 },
      outer: { heightCm: 41, widthCm: 41, lengthCm: 41 },
      maxWeightG: 5000,
    };
    const forte = {
      ...CAIXA_G,
      id: 'forte',
      code: 'FORTE',
      inner: { heightCm: 30, widthCm: 30, lengthCm: 30 },
      outer: { heightCm: 31, widthCm: 31, lengthCm: 31 },
      maxWeightG: 20_000,
    };
    const peca = pecaDeTeste('cubo-1kg', [10, 10, 10], 1000, 31);
    const r = packSingleProduct(peca, [larga, forte], SETTINGS_PADRAO);

    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(r.volumes.map((v) => [v.box.code, v.contents[0].quantity])).toEqual([
      ['LARGA', 5],
      ['LARGA', 5],
      ['LARGA', 5],
      ['FORTE', 16],
    ]);
  });
});

describe('packSingleProduct — lista de caixas muito grande', () => {
  it('1.000.000 de caixas na lista respondem ok, sem estourar a pilha', () => {
    // Math.max(...lista) passa cada capacidade como argumento e estoura a pilha
    // (RangeError) com listas dessa ordem. 10 peças de 10 cm (500 g) cabem
    // numa GG: 1 volume com as 10 unidades.
    const muitas = Array.from({ length: 1_000_000 }, () => CAIXA_GG);
    const resultado = packSingleProduct(
      pecaDeTeste('peq', [10, 10, 10], 500, 10),
      muitas,
      SETTINGS_PADRAO,
    );

    expect(resultado.status).toBe('ok');
    expect(resultado.status === 'ok' ? resultado.volumes.length : 0).toBe(1);
  });
});
