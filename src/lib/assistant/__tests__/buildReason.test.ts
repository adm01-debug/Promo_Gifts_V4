import { describe, expect, it } from 'vitest';

import {
  AVISO_GRAVACAO,
  MOTIVO_SEM_SINAL,
  ORDEM_DOS_SINAIS,
  SEPARADOR,
  buildHonestNote,
  buildReason,
  type DadosDoProduto,
  type PedidoDeEncaixe,
  type ResultadoDoEncaixe,
  type SinaisDeEncaixe,
} from '../buildReason';

/** Nenhum sinal ligado — base para montar cada cenário sem repetir as 7 chaves. */
const NENHUM: SinaisDeEncaixe = {
  ramo: false,
  cor: false,
  giro: false,
  novidade: false,
  gravacao: false,
  preco: false,
  estoque: false,
};

const TODOS: SinaisDeEncaixe = {
  ramo: true,
  cor: true,
  giro: true,
  novidade: true,
  gravacao: true,
  preco: true,
  estoque: true,
};

/**
 * Dados de um produto plausível. Ramo "Saúde" é um dos 22 nomes de
 * `ramo_atividade`; a classe 'A' vem de `mv_product_intelligence`. Nada aqui é
 * ID de produção — são só os textos que a frase precisa.
 */
const DADOS: DadosDoProduto = {
  ramoNome: 'Saúde',
  corNome: 'Azul',
  corExata: true,
  classeGiro: 'A',
  faixaMin: 15,
  faixaMax: 60,
};

/**
 * Tira o aviso da gravação da frase, para o teste conferir um trecho isolado sem
 * ter de ligar o sinal de gravação (ligá-lo acrescenta "aceita gravação" na
 * posição de peso dele, antes de preço e estoque).
 */
const semAviso = (frase: string): string =>
  frase
    .split(SEPARADOR)
    .filter((trecho) => trecho !== AVISO_GRAVACAO)
    .join(SEPARADOR);

describe('buildReason', () => {
  it('com todos os sinais ligados, cita os sete na ordem do mais forte ao mais fraco', () => {
    expect(buildReason(TODOS, DADOS)).toBe(
      'Serve para o ramo Saúde · tem versão azul (igual à logo) · ' +
        'Classe A no portfólio do fornecedor · novidade no catálogo · ' +
        'aceita gravação · cabe em R$ 15–60 · pronta entrega',
    );
  });

  it('a ordem dos trechos acompanha ORDEM_DOS_SINAIS', () => {
    const trechos = buildReason(TODOS, DADOS).split(SEPARADOR);
    const marcadores: Record<string, string> = {
      ramo: 'ramo Saúde',
      cor: 'versão azul',
      giro: 'Classe A',
      novidade: 'novidade',
      gravacao: 'aceita gravação',
      preco: 'cabe em',
      estoque: 'pronta entrega',
    };
    const posicoes = ORDEM_DOS_SINAIS.map((chave) =>
      trechos.findIndex((trecho) => trecho.includes(marcadores[chave])),
    );
    expect(posicoes).toStrictEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  describe('só um sinal', () => {
    it('só ramo: cita o ramo e mais nada (fora o aviso da gravação)', () => {
      const frase = buildReason({ ...NENHUM, ramo: true }, DADOS);
      expect(frase).toBe(`Serve para o ramo Saúde${SEPARADOR}${AVISO_GRAVACAO}`);
      expect(frase).not.toContain('Classe');
      expect(frase).not.toContain('pronta entrega');
      expect(frase).not.toContain('cabe em');
    });

    it('só estoque: a frase começa com maiúscula mesmo sem o trecho de ramo', () => {
      expect(buildReason({ ...NENHUM, estoque: true }, DADOS)).toBe(
        `Pronta entrega${SEPARADOR}${AVISO_GRAVACAO}`,
      );
    });

    it('só gravação: afirma a gravação e não repete o aviso', () => {
      const frase = buildReason({ ...NENHUM, gravacao: true }, DADOS);
      expect(frase).toBe('Aceita gravação');
      expect(frase).not.toContain(AVISO_GRAVACAO);
    });
  });

  describe('nenhum sinal', () => {
    it('não devolve frase vazia nem elogio que não se sustenta', () => {
      const frase = buildReason(NENHUM, DADOS);
      expect(frase).toBe(`${MOTIVO_SEM_SINAL}${SEPARADOR}${AVISO_GRAVACAO}`);
      expect(frase.trim().length).toBeGreaterThan(0);
      for (const mentira of [
        'Serve para o ramo',
        'versão azul',
        'Classe A',
        'novidade',
        'aceita gravação',
        'cabe em',
        'pronta entrega',
      ]) {
        expect(frase).not.toContain(mentira);
      }
    });

    it('sem sinal e sem dados do produto, ainda devolve frase utilizável', () => {
      expect(buildReason(NENHUM)).toBe(`${MOTIVO_SEM_SINAL}${SEPARADOR}${AVISO_GRAVACAO}`);
    });
  });

  describe('gravação ausente', () => {
    it('avisa em vez de afirmar que aceita, e o aviso vai para o fim', () => {
      const frase = buildReason({ ...TODOS, gravacao: false }, DADOS);
      expect(frase).not.toContain('aceita gravação');
      expect(frase).toContain(AVISO_GRAVACAO);
      expect(frase.endsWith(AVISO_GRAVACAO)).toBe(true);
    });

    it('nunca diz que o produto NÃO aceita gravação', () => {
      // A ingestão de `products.allows_personalization` está quebrada (medido em
      // 2026-11-15: 0 dos 274 produtos `is_new` têm a marca, e 0 produtos ativos
      // têm a marca nula), então `false` não prova recusa.
      const frase = buildReason({ ...NENHUM, ramo: true }, DADOS);
      expect(frase).not.toContain('não aceita');
    });
  });

  describe('nunca inventa número nem classe', () => {
    it('preço sem faixa informada: fala da faixa sem citar valor', () => {
      const frase = semAviso(buildReason({ ...NENHUM, preco: true }, {}));
      expect(frase).toBe('Cabe na faixa de preço do cliente');
      expect(frase).not.toMatch(/\d/);
    });

    it('giro sem classe medida: não chuta "Classe A"', () => {
      const frase = semAviso(buildReason({ ...NENHUM, giro: true }, { classeGiro: null }));
      expect(frase).toBe('Tem giro no portfólio do fornecedor');
      expect(frase).not.toContain('Classe');
    });

    it('classe C medida é dita como está, sem maquiagem', () => {
      expect(semAviso(buildReason({ ...NENHUM, giro: true }, { classeGiro: 'C' }))).toBe(
        'Classe C no portfólio do fornecedor',
      );
    });

    it('cor aproximada não é vendida como igual à logo', () => {
      expect(
        semAviso(
          buildReason({ ...NENHUM, cor: true }, { corNome: 'Azul Marinho', corExata: false }),
        ),
      ).toBe('Tem versão azul marinho (parecida com a logo)');
    });

    it('cor sem nome de grupo: não inventa o nome da cor', () => {
      expect(semAviso(buildReason({ ...NENHUM, cor: true }, {}))).toBe('Tem versão na cor da logo');
    });

    it('formata reais em pt-BR, com centavos só quando existem', () => {
      expect(
        semAviso(buildReason({ ...NENHUM, preco: true }, { faixaMin: 15.5, faixaMax: 1200 })),
      ).toBe('Cabe em R$ 15,50–1.200');
    });

    it('faixa só com teto: não inventa o piso', () => {
      expect(semAviso(buildReason({ ...NENHUM, preco: true }, { faixaMax: 60 }))).toBe(
        'Cabe até R$ 60',
      );
    });

    it('faixa com valor inválido é tratada como ausente', () => {
      expect(
        semAviso(buildReason({ ...NENHUM, preco: true }, { faixaMin: Number.NaN, faixaMax: null })),
      ).toBe('Cabe na faixa de preço do cliente');
    });
  });
});

describe('buildHonestNote', () => {
  const PEDIDO: PedidoDeEncaixe = {
    queriaNovidade: true,
    corDaLogoNome: 'Azul',
    faixaMin: 15,
    faixaMax: 60,
  };

  it('cenário 1 — queria novidade azul nessa faixa e não achou: confessa a troca', () => {
    const resultado: ResultadoDoEncaixe = {
      total: 8,
      comNovidade: 0,
      comCorDaLogo: 8,
      comGiro: 6,
      comGiroNaCorDaLogo: 5,
      semMarcaDeGravacao: 0,
    };
    expect(buildHonestNote(PEDIDO, resultado)).toBe(
      'Não achei novidade azul nessa faixa — troquei por 5 campeões de giro em azul.',
    );
  });

  it('cenário 2 — não achou nada: diz que não achou, sem oferecer substituto', () => {
    expect(buildHonestNote(PEDIDO, { total: 0 })).toBe(
      'Não achei nenhum brinde azul nessa faixa com encaixe para este cliente.',
    );
  });

  it('cenário 3 — achou o que foi pedido: não há rodapé nenhum', () => {
    const resultado: ResultadoDoEncaixe = {
      total: 8,
      comNovidade: 3,
      comCorDaLogo: 8,
      comGiro: 5,
      comGiroNaCorDaLogo: 5,
      semMarcaDeGravacao: 0,
    };
    expect(buildHonestNote(PEDIDO, resultado)).toBeNull();
  });

  it('sem contagem de giro na cor da logo, não afirma a troca "em azul"', () => {
    const nota = buildHonestNote(PEDIDO, {
      total: 8,
      comNovidade: 0,
      comCorDaLogo: 8,
      comGiro: 6,
    });
    expect(nota).toBe('Não achei novidade azul nessa faixa — troquei por 6 campeões de giro.');
  });

  it('sem novidade e sem giro, não promete campeão que não existe', () => {
    expect(
      buildHonestNote({ queriaNovidade: true }, { total: 4, comNovidade: 0, comGiro: 0 }),
    ).toBe('Não achei novidade — troquei por 4 que encaixam por outros sinais.');
  });

  it('cor da logo pedida e nenhuma versão achada: diz isso na cara', () => {
    expect(
      buildHonestNote({ corDaLogoNome: 'Vinho' }, { total: 8, comNovidade: 2, comCorDaLogo: 0 }),
    ).toBe(
      'Nenhum dos 8 tem versão vinho — a cor da logo não bateu com nenhum grupo de cor do catálogo.',
    );
  });

  it('lista de um só produto sem a cor: a frase sai em português', () => {
    expect(buildHonestNote({ corDaLogoNome: 'Vinho' }, { total: 1, comCorDaLogo: 0 })).toBe(
      'O único que achei não tem versão vinho — a cor da logo não bateu com nenhum grupo de cor do catálogo.',
    );
  });

  it('produtos sem a marca de gravação entram no rodapé com o aviso', () => {
    const nota = buildHonestNote({}, { total: 8, comCorDaLogo: 8, semMarcaDeGravacao: 3 });
    expect(nota).toBe(
      `3 estão sem a marca de gravação no cadastro — ${AVISO_GRAVACAO} com o fornecedor.`,
    );
  });

  it('um único produto sem a marca usa singular', () => {
    expect(buildHonestNote({}, { total: 8, semMarcaDeGravacao: 1 })).toBe(
      `1 está sem a marca de gravação no cadastro — ${AVISO_GRAVACAO} com o fornecedor.`,
    );
  });

  it('contagem absurda não vira número inventado: fica limitada ao total', () => {
    expect(buildHonestNote({}, { total: 2, semMarcaDeGravacao: 99 })).toBe(
      `2 estão sem a marca de gravação no cadastro — ${AVISO_GRAVACAO} com o fornecedor.`,
    );
  });

  it('nada pedido e nada faltando: devolve null em vez de linha vazia', () => {
    expect(buildHonestNote({}, { total: 8 })).toBeNull();
  });
});
