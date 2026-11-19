/**
 * packSingleProduct.test.ts — um produto, N unidades, nas 4 caixas padrão.
 *
 * Capacidades (de `fitCount.test.ts`):
 * caderneta → P 64 · M 128 · G 140 · GG 250
 * squeeze   → P 16 · M  24 · G  49 · GG  70
 */
import { describe, expect, it } from 'vitest';

import { packSingleProduct } from '../packSingleProduct';
import { CAIXAS_PADRAO, CAIXA_G, CAIXA_M, CAIXA_P, SETTINGS_PADRAO } from './fixtures/boxes';
import { barraGigante, caderneta, squeeze } from './fixtures/items';

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
