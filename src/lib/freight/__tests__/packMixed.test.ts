/**
 * packMixed.test.ts — produtos diferentes na mesma caixa.
 *
 * Capacidades: caderneta → P 64 · M 128 · G 140 · GG 250
 *              squeeze   → P 16 · M  24 · G  49 · GG  70
 */
import { describe, expect, it } from 'vitest';

import { packMixed } from '../packMixed';
import { packSingleProduct } from '../packSingleProduct';
import { CAIXAS_PADRAO, CAIXA_G, CAIXA_M, CAIXA_P, SETTINGS_PADRAO } from './fixtures/boxes';
import { barraGigante, caderneta, pecaDeTeste, squeeze } from './fixtures/items';

function quantidadePorProduto(
  volumes: Array<{ contents: Array<{ item: { productId: string }; quantity: number }> }>,
) {
  const soma = new Map<string, number>();
  for (const v of volumes) {
    for (const c of v.contents) {
      soma.set(c.item.productId, (soma.get(c.item.productId) ?? 0) + c.quantity);
    }
  }
  return soma;
}

describe('packMixed', () => {
  it('50 cadernetas + 50 squeezes cabem numa GG só', () => {
    // fração na GG: 50/70 (squeeze) + 50/250 (caderneta) = 0,714 + 0,200 = 0,914 ≤ 1
    // peso: 50 × 80 + 50 × 120 = 4.000 + 6.000 = 10.000 g ≤ 30.000 g
    // nenhuma caixa menor segura: G dá 50/49 + 50/140 = 1,020 + 0,357 > 1
    const r = packMixed([caderneta(50), squeeze(50)], CAIXAS_PADRAO, SETTINGS_PADRAO);

    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(r.volumes).toHaveLength(1);
    expect(r.volumes[0].box.code).toBe('GG');
    expect(quantidadePorProduto(r.volumes)).toEqual(
      new Map([
        ['squeeze', 50],
        ['caderneta', 50],
      ]),
    );
  });

  it('misturar nunca usa mais caixas que separar', () => {
    const misturado = packMixed([caderneta(50), squeeze(50)], CAIXAS_PADRAO, SETTINGS_PADRAO);
    const soCaderneta = packSingleProduct(caderneta(50), CAIXAS_PADRAO, SETTINGS_PADRAO);
    const soSqueeze = packSingleProduct(squeeze(50), CAIXAS_PADRAO, SETTINGS_PADRAO);

    expect(misturado.status).toBe('ok');
    expect(soCaderneta.status).toBe('ok');
    expect(soSqueeze.status).toBe('ok');
    if (misturado.status !== 'ok' || soCaderneta.status !== 'ok' || soSqueeze.status !== 'ok')
      return;

    // separado: 1× P (50 cadernetas, cabem 64) + 1× GG (50 squeezes, cabem 70) = 2 volumes
    expect(soCaderneta.volumes).toHaveLength(1);
    expect(soSqueeze.volumes).toHaveLength(1);
    expect(misturado.volumes.length).toBeLessThanOrEqual(
      soCaderneta.volumes.length + soSqueeze.volumes.length,
    );
    expect(misturado.volumes).toHaveLength(1);
  });

  it('preserva a quantidade de cada produto quando precisa de várias caixas', () => {
    const r = packMixed([caderneta(400), squeeze(300)], CAIXAS_PADRAO, SETTINGS_PADRAO);

    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(quantidadePorProduto(r.volumes)).toEqual(
      new Map([
        ['squeeze', 300],
        ['caderneta', 400],
      ]),
    );
  });

  it('nenhum volume passa do peso máximo da própria caixa', () => {
    const r = packMixed([caderneta(400), squeeze(300)], CAIXAS_PADRAO, SETTINGS_PADRAO);

    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    for (const volume of r.volumes) {
      const pesoG = volume.contents.reduce((s, c) => s + c.item.weightG * c.quantity, 0);
      expect(pesoG, `caixa ${volume.box.code}`).toBeLessThanOrEqual(
        volume.box.maxWeightG - volume.box.emptyWeightG,
      );
    }
  });

  it('peças maiores entram primeiro', () => {
    // squeeze (1.225 cm³) antes de caderneta (294 cm³), em qualquer ordem de entrada
    const r = packMixed([caderneta(10), squeeze(10)], CAIXAS_PADRAO, SETTINGS_PADRAO);

    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(r.volumes[0].contents[0].item.productId).toBe('squeeze');
  });

  it('peça que não cabe em nenhuma caixa interrompe o grupo', () => {
    const r = packMixed([caderneta(10), barraGigante(1)], CAIXAS_PADRAO, SETTINGS_PADRAO);

    expect(r.status).toBe('nao_cabe');
    if (r.status !== 'nao_cabe') return;
    expect(r.item.productId).toBe('barra-61');
  });

  it('catálogo restrito: usa a maior disponível e enche em sequência', () => {
    // só P (caderneta 64, squeeze 16) e M (caderneta 128, squeeze 24)
    const r = packMixed([caderneta(100), squeeze(30)], [CAIXA_P, CAIXA_M], SETTINGS_PADRAO);

    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(quantidadePorProduto(r.volumes)).toEqual(
      new Map([
        ['squeeze', 30],
        ['caderneta', 100],
      ]),
    );
    for (const volume of r.volumes) {
      const fracao = volume.contents.reduce((soma, c) => {
        const capacidade =
          c.item.productId === 'caderneta'
            ? volume.box.code === 'M'
              ? 128
              : 64
            : volume.box.code === 'M'
              ? 24
              : 16;
        return soma + c.quantity / capacidade;
      }, 0);
      expect(fracao, `caixa ${volume.box.code}`).toBeLessThanOrEqual(1.000001);
    }
  });

  it('peça comprida e fina: a caixa escolhida a ignora e o grupo termina em nao_cabe', () => {
    // agulha 50 × 1 × 1 cm (50 cm³): volume unitário pequeno, mas o lado de
    // 50 cm não entra na P (maior lado interno 32,4). O squeeze (1.225 cm³)
    // é empacotado primeiro e a agulha é pulada na caixa aberta.
    const agulha = pecaDeTeste('agulha', [50, 1, 1], 100, 10, { name: 'Agulha de 50 cm' });
    const r = packMixed([squeeze(10), agulha], [CAIXA_P], SETTINGS_PADRAO);

    expect(r.status).toBe('nao_cabe');
    if (r.status !== 'nao_cabe') return;
    expect(r.item.productId).toBe('agulha');
  });

  it('caixa tomada pela primeira peça manda o resto para outra caixa', () => {
    // na G o squeeze tem capacidade 49: 50 unidades enchem a caixa e a agulha
    // (que cabe na G, capacidade 250) fica para a próxima.
    const agulha = pecaDeTeste('agulha', [50, 1, 1], 100, 10, { name: 'Agulha de 50 cm' });
    const r = packMixed([squeeze(50), agulha], [CAIXA_P, CAIXA_M, CAIXA_G], SETTINGS_PADRAO);

    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(r.volumes.length).toBeGreaterThan(1);
    expect(quantidadePorProduto(r.volumes)).toEqual(
      new Map([
        ['squeeze', 50],
        ['agulha', 10],
      ]),
    );
    // a primeira caixa fecha com o squeeze no limite e sem agulha
    expect(r.volumes[0].contents.map((c) => c.item.productId)).toEqual(['squeeze']);
  });

  it('lista vazia e quantidades zeradas não abrem caixa', () => {
    expect(packMixed([], CAIXAS_PADRAO, SETTINGS_PADRAO)).toEqual({ status: 'ok', volumes: [] });
    expect(packMixed([caderneta(0), squeeze(0)], CAIXAS_PADRAO, SETTINGS_PADRAO)).toEqual({
      status: 'ok',
      volumes: [],
    });
  });

  it('produto leve e volumoso junto com denso e pequeno: os dois tetos valem', () => {
    // bloco de chumbo 5 × 5 × 5 cm (125 cm³) e 5 kg: o peso corta antes do espaço
    const chumbo = pecaDeTeste('chumbo', [5, 5, 5], 5000, 10, { name: 'Bloco denso' });
    const r = packMixed([chumbo, caderneta(50)], CAIXAS_PADRAO, SETTINGS_PADRAO);

    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(quantidadePorProduto(r.volumes)).toEqual(
      new Map([
        ['chumbo', 10],
        ['caderneta', 50],
      ]),
    );
    for (const volume of r.volumes) {
      const pesoG = volume.contents.reduce((s, c) => s + c.item.weightG * c.quantity, 0);
      expect(pesoG).toBeLessThanOrEqual(volume.box.maxWeightG - volume.box.emptyWeightG);
    }
  });
});
