/**
 * packMixed.test.ts — produtos diferentes na mesma caixa.
 *
 * Capacidades: caderneta → P 64 · M 128 · G 140 · GG 250
 *              squeeze   → P 16 · M  24 · G  49 · GG  70
 */
import { describe, expect, it } from 'vitest';

import { packMixed } from '../packMixed';
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

  it('escolhe a MENOR caixa que segura tudo, em qualquer ordem de cadastro', () => {
    // na P: 5/16 (squeeze) + 5/64 (caderneta) = 0,3125 + 0,0781 = 0,3906 ≤ 1
    // peso: 5 × 80 + 5 × 120 = 400 + 600 = 1.000 g ≤ 10.000 g
    // a lista chega fora de ordem de propósito: quem ordena é o empacotador
    const r = packMixed(
      [caderneta(5), squeeze(5)],
      [CAIXA_GG, CAIXA_P, CAIXA_G, CAIXA_M],
      SETTINGS_PADRAO,
    );

    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(r.volumes.map((v) => v.box.code)).toEqual(['P']);
    expect(r.volumes[0].contents.map((c) => [c.item.productId, c.quantity])).toEqual([
      ['squeeze', 5],
      ['caderneta', 5],
    ]);
  });

  it('sem caixa que segure tudo, abre a MAIOR e fecha o resto na menor', () => {
    // capacidades na GG: squeeze 70, caderneta 250
    // caixa 1: nenhuma segura 100 squeezes (GG leva 70) → GG com 70 squeezes
    //          (fração 70/70 = 1: não sobra espaço para caderneta)
    // caixa 2: restam 30 squeezes + 200 cadernetas; na GG 30/70 + 200/250 =
    //          0,4286 + 0,8 = 1,2286 > 1 → GG de novo, com os 30 squeezes e
    //          ⌊(1 − 0,4286) × 250⌋ = ⌊142,86⌋ = 142 cadernetas
    //          (peso: 30 × 80 + 142 × 120 = 2.400 + 17.040 = 19.440 g ≤ 30.000)
    // caixa 3: restam 58 cadernetas → P (leva 64)
    const r = packMixed([squeeze(100), caderneta(200)], CAIXAS_PADRAO, SETTINGS_PADRAO);

    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(
      r.volumes.map((v) => [v.box.code, v.contents.map((c) => [c.item.productId, c.quantity])]),
    ).toEqual([
      ['GG', [['squeeze', 70]]],
      [
        'GG',
        [
          ['squeeze', 30],
          ['caderneta', 142],
        ],
      ],
      ['P', [['caderneta', 58]]],
    ]);
  });

  describe('caixa exatamente cheia', () => {
    // Cubos de 1 kg: na P o peso corta os dois em 10.000 ÷ 1.000 = 10
    // (geometria e volume dão bem mais: 180 e 199 para o de 5 cm).
    const cuboA = (quantity: number) => pecaDeTeste('a', [5, 5, 5], 1000, quantity);
    const cuboB = (quantity: number) => pecaDeTeste('b', [4, 4, 4], 1000, quantity);

    it('5 + 5 peças de 1 kg fecham uma P: fração 1 e peso no máximo ainda cabem', () => {
      // fração: 5/10 + 5/10 = 1 · peso: 10 × 1.000 = 10.000 g = máximo da P
      const r = packMixed([cuboA(5), cuboB(5)], CAIXAS_PADRAO, SETTINGS_PADRAO);

      expect(r.status).toBe('ok');
      if (r.status !== 'ok') return;
      expect(r.volumes.map((v) => v.box.code)).toEqual(['P']);
      expect(r.volumes[0].contents.map((c) => c.quantity)).toEqual([5, 5]);
    });

    it('9 + 1 peças de 1 kg fecham uma P: (1 − 0,9) × 10 não pode virar 0', () => {
      // fração: 9/10 + 1/10 = 1. Depois dos 9 cubos sobra (1 − 0,9) × 10, que em
      // float é 0,9999999999999998: sem a tolerância do piso a última peça
      // abriria uma segunda caixa.
      const r = packMixed([cuboA(9), cuboB(1)], CAIXAS_PADRAO, SETTINGS_PADRAO);

      expect(r.status).toBe('ok');
      if (r.status !== 'ok') return;
      expect(r.volumes.map((v) => v.box.code)).toEqual(['P']);
      expect(r.volumes[0].contents.map((c) => c.quantity)).toEqual([9, 1]);
    });

    it('soma de frações que em float passa de 1 por um fio ainda fecha na P', () => {
      // capacidades na P, todas pelo peso: 10.000 ÷ 96 = 104,17 → 104;
      // 10.000 ÷ 192 = 52,08 → 52 (para as duas peças de 192 g)
      // fração: 70/104 + 12/52 + 5/52 = 35/52 + 12/52 + 5/52 = 52/52 = 1
      //         (em float a soma dá 1,0000000000000002)
      // peso: 70 × 96 + 12 × 192 + 5 × 192 = 6.720 + 2.304 + 960 = 9.984 g ≤ 10.000
      const r = packMixed(
        [
          pecaDeTeste('a', [5, 5, 5], 96, 70),
          pecaDeTeste('b', [4, 4, 4], 192, 12),
          pecaDeTeste('c', [3, 3, 3], 192, 5),
        ],
        CAIXAS_PADRAO,
        SETTINGS_PADRAO,
      );

      expect(r.status).toBe('ok');
      if (r.status !== 'ok') return;
      expect(r.volumes.map((v) => v.box.code)).toEqual(['P']);
      expect(r.volumes[0].contents.map((c) => c.quantity)).toEqual([70, 12, 5]);
    });
  });

  describe('caixas cheias de uma vez e teto de volumes', () => {
    it('500 squeezes + 200 cadernetas: 7 GG cheias de squeeze e uma GG com o resto', () => {
      // squeeze na GG: 70. Enquanto sobram 70 ou mais, a GG fecha só com squeeze:
      // 500 = 7 × 70 + 10 → 7 GG cheias (1 no laço + 6 contadas de uma vez)
      // resto: 10 squeezes + 200 cadernetas → 10/70 + 200/250 = 0,143 + 0,8 =
      // 0,943 ≤ 1 na GG (na G, 200/140 > 1) · peso 10 × 80 + 200 × 120 = 24.800 g
      const r = packMixed([squeeze(500), caderneta(200)], CAIXAS_PADRAO, SETTINGS_PADRAO);

      expect(r.status).toBe('ok');
      if (r.status !== 'ok') return;
      expect(
        r.volumes.map((v) => [v.box.code, v.contents.map((c) => [c.item.productId, c.quantity])]),
      ).toEqual([
        ['GG', [['squeeze', 70]]],
        ['GG', [['squeeze', 70]]],
        ['GG', [['squeeze', 70]]],
        ['GG', [['squeeze', 70]]],
        ['GG', [['squeeze', 70]]],
        ['GG', [['squeeze', 70]]],
        ['GG', [['squeeze', 70]]],
        [
          'GG',
          [
            ['squeeze', 10],
            ['caderneta', 200],
          ],
        ],
      ]);
      // os volumes iguais não dividem objeto: mexer num não mexe no vizinho
      expect(r.volumes[1]).not.toBe(r.volumes[2]);
      expect(r.volumes[1].contents).not.toBe(r.volumes[2].contents);
      expect(r.volumes[1].contents[0]).not.toBe(r.volumes[2].contents[0]);
    });

    it('490 squeezes: a última GG cheia é a que "segura tudo", não entra no lote', () => {
      // 490 = 7 × 70. Depois da 1ª, sobram 420: as 5 seguintes repetem; quando
      // sobram exatamente 70 a GG segura tudo e fecha pelo caminho normal.
      const r = packMixed([squeeze(490)], CAIXAS_PADRAO, SETTINGS_PADRAO);

      expect(r.status).toBe('ok');
      if (r.status !== 'ok') return;
      expect(r.volumes.map((v) => [v.box.code, v.contents[0].quantity])).toEqual([
        ['GG', 70],
        ['GG', 70],
        ['GG', 70],
        ['GG', 70],
        ['GG', 70],
        ['GG', 70],
        ['GG', 70],
      ]);
    });

    it('101 squeezes + 200 cadernetas: sobra menos de uma GG cheia, nada é contado em lote', () => {
      // caixa 1: GG cheia com 70 squeezes; sobram 31, que não enchem outra
      //          (⌊31/70⌋ = 0 caixas iguais em seguida)
      // caixa 2: 31/70 + 200/250 = 0,443 + 0,8 = 1,243 > 1 → GG com os 31 e
      //          ⌊(1 − 31/70) × 250⌋ = ⌊139,29⌋ = 139 cadernetas
      // caixa 3: 200 − 139 = 61 cadernetas → P (leva 64)
      const r = packMixed([squeeze(101), caderneta(200)], CAIXAS_PADRAO, SETTINGS_PADRAO);

      expect(r.status).toBe('ok');
      if (r.status !== 'ok') return;
      expect(
        r.volumes.map((v) => [v.box.code, v.contents.map((c) => [c.item.productId, c.quantity])]),
      ).toEqual([
        ['GG', [['squeeze', 70]]],
        [
          'GG',
          [
            ['squeeze', 31],
            ['caderneta', 139],
          ],
        ],
        ['P', [['caderneta', 61]]],
      ]);
    });

    it('quantidade infinita não trava nem vira "zero volume": para no teto', () => {
      const r = packMixed(
        [squeeze(Number.POSITIVE_INFINITY), caderneta(200)],
        CAIXAS_PADRAO,
        SETTINGS_PADRAO,
      );
      expect(r.status).toBe('volumes_demais');
    });

    it('o teto é o que quem chama passar: os 8 volumes acima não cabem em 7', () => {
      const itens = [squeeze(500), caderneta(200)];
      expect(packMixed(itens, CAIXAS_PADRAO, SETTINGS_PADRAO, 7)).toEqual({
        status: 'volumes_demais',
        quantos: 8,
      });
      expect(packMixed(itens, CAIXAS_PADRAO, SETTINGS_PADRAO, 8).status).toBe('ok');
    });

    it('7.000.010 squeezes + 200 cadernetas: 100.001 caixas contadas, nenhuma montada', () => {
      // 7.000.010 = 100.000 × 70 + 10 → 100.000 GG cheias + 1 GG com os 10
      // squeezes e as 200 cadernetas (conta do primeiro caso)
      const r = packMixed([squeeze(7_000_010), caderneta(200)], CAIXAS_PADRAO, SETTINGS_PADRAO);
      expect(r).toEqual({ status: 'volumes_demais', quantos: 100_001 });
    });

    it('Number.MAX_SAFE_INTEGER de squeezes: a contagem sai sem laço por caixa', () => {
      // 9.007.199.254.740.991 = 128.674.275.067.728 × 70 + 31
      // 1 GG no laço + 128.674.275.067.727 de uma vez (a última começa com 101)
      // 31 squeezes + 200 cadernetas: 31/70 + 200/250 = 1,243 > 1 → GG com os 31
      //   e ⌊(1 − 31/70) × 250⌋ = 139 cadernetas; as 61 restantes → P (leva 64)
      // total: 1 + 128.674.275.067.727 + 1 + 1 = 128.674.275.067.730
      const r = packMixed(
        [squeeze(Number.MAX_SAFE_INTEGER), caderneta(200)],
        CAIXAS_PADRAO,
        SETTINGS_PADRAO,
      );
      expect(r).toEqual({ status: 'volumes_demais', quantos: 128_674_275_067_730 });
    });
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

describe('packMixed — cache de capacidade por caixa e por peça', () => {
  it('duas peças com o mesmo productId e medidas diferentes não trocam a capacidade', () => {
    // 'dup' 30 × 30 × 30 cm, 2.000 g: 1 por caixa na GG (e não entra na P).
    // 'dup' 1 × 1 × 1 cm, 1 g: 2 cubinhos cabem na P.
    // Com chave só de id, o cubinho emprestaria a capacidade do cubo (ou o contrário).
    // Esperado: cubos 1 por GG (2 GG), cubinhos juntos na P.
    const cubo = pecaDeTeste('dup', [30, 30, 30], 2000, 2);
    const cubinho = pecaDeTeste('dup', [1, 1, 1], 1, 2);

    const resultado = packMixed([cubo, cubinho], CAIXAS_PADRAO, SETTINGS_PADRAO);

    expect(resultado.status).toBe('ok');
    if (resultado.status !== 'ok') return;
    expect(
      resultado.volumes.map(({ box, contents }) => [box.code, contents.map((c) => c.quantity)]),
    ).toEqual([
      ['GG', [1]],
      ['GG', [1]],
      ['P', [2]],
    ]);
  });

  it('caixas com o mesmo id (ou sem id) não emprestam capacidade uma à outra', () => {
    // 100 peças 10 × 10 × 10 cm de 500 g + 1.000 canetas 14 × 1 × 1 cm de 10 g,
    // em caixas todas com o id 'mesma'. Peso: 100 × 500 + 1.000 × 10 = 60.000 g
    // = 2 GG de 30 kg. Com a chave só pelo id, a P (18 peças) emprestava a
    // capacidade à GG e saíam 6 GG + 1 P.
    const mesmaId = CAIXAS_PADRAO.map((caixa) => ({ ...caixa, id: 'mesma' }));
    const pecas = [
      pecaDeTeste('peq', [10, 10, 10], 500, 100),
      pecaDeTeste('caneta', [14, 1, 1], 10, 1000),
    ];

    const igual = packMixed(pecas, mesmaId, SETTINGS_PADRAO);
    const distinto = packMixed(pecas, CAIXAS_PADRAO, SETTINGS_PADRAO);

    const codigos = (r: ReturnType<typeof packMixed>) =>
      r.status === 'ok' ? r.volumes.map(({ box }) => box.code) : [];
    expect(codigos(distinto)).toEqual(['GG', 'GG']);
    expect(codigos(igual)).toEqual(['GG', 'GG']);
  });
});
