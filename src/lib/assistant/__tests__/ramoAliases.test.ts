import { describe, it, expect } from 'vitest';
import {
  APELIDOS_POR_RAMO,
  RAMOS_CANONICOS,
  chaveRamo,
  normalizeRamo,
  type RamoCatalogo,
} from '../ramoAliases';

/**
 * Catálogo de teste: IDs sintéticos de propósito. Os IDs reais de
 * `ramo_atividade` são dado de produção e não entram em código nem em fixture;
 * o que importa aqui é que `normalizeRamo` resolva o ID a partir do catálogo
 * que o chamador passa, casando por nome.
 */
const CATALOGO: readonly RamoCatalogo[] = RAMOS_CANONICOS.map((nome, i) => ({
  id: `ramo-${i + 1}`,
  nome,
}));

const idDe = (nome: string): string => CATALOGO.find((linha) => linha.nome === nome)!.id;

describe('normalizeRamo', () => {
  describe('os 22 nomes do catálogo (confiança alta)', () => {
    it('reconhece os 22 nomes exatos e resolve o ID pelo catálogo', () => {
      expect(RAMOS_CANONICOS).toHaveLength(22);
      for (const nome of RAMOS_CANONICOS) {
        expect(normalizeRamo(nome, CATALOGO)).toEqual({
          ramoPaiId: idDe(nome),
          nome,
          confianca: 'alta',
        });
      }
    });

    it('sem catálogo, traduz o nome mas devolve ramoPaiId null', () => {
      expect(normalizeRamo('Indústria Farmacêutica')).toEqual({
        ramoPaiId: null,
        nome: 'Indústria Farmacêutica',
        confianca: 'alta',
      });
    });

    it('devolve ramoPaiId null quando o catálogo não tem o ramo traduzido', () => {
      const parcial: readonly RamoCatalogo[] = [{ id: 'ramo-agro', nome: 'Agro' }];
      expect(normalizeRamo('Tecnologia', parcial)).toEqual({
        ramoPaiId: null,
        nome: 'Tecnologia',
        confianca: 'alta',
      });
      expect(normalizeRamo('Agro', parcial).ramoPaiId).toBe('ramo-agro');
    });
  });

  describe('desvios reais digitados no CRM (confiança média)', () => {
    const DESVIOS: ReadonlyArray<readonly [string, string]> = [
      ['Farmacêutico', 'Indústria Farmacêutica'],
      ['Clínica', 'Saúde'],
      ['Construtora', 'Indústria Construção'],
      ['Transportadora', 'Transportes e Logística'],
      ['Banco', 'Financeiro'],
      ['Agronegócio', 'Agro'],
    ];

    it.each(DESVIOS)('traduz %s para %s', (texto, esperado) => {
      expect(normalizeRamo(texto, CATALOGO)).toEqual({
        ramoPaiId: idDe(esperado),
        nome: esperado,
        confianca: 'media',
      });
    });

    it('manda Petroquímica para Petróleo, não para Indústria Química', () => {
      const resultado = normalizeRamo('Petroquímica', CATALOGO);
      expect(resultado.nome).toBe('Petróleo');
      expect(resultado.confianca).toBe('media');
    });

    it('cada apelido curado cai no ramo que a tabela declara', () => {
      for (const [ramo, apelidos] of Object.entries(APELIDOS_POR_RAMO)) {
        for (const apelido of apelidos) {
          expect(normalizeRamo(apelido, CATALOGO)).toEqual({
            ramoPaiId: idDe(ramo),
            nome: ramo,
            confianca: 'media',
          });
        }
      }
    });
  });

  describe('sem correspondência honesta: devolve null em vez de chutar', () => {
    const SEM_RAMO: ReadonlyArray<string> = [
      'Supermercado',
      'Imobiliária',
      'Agência de publicidade',
    ];

    it.each(SEM_RAMO)('não inventa ramo para %s', (texto) => {
      expect(normalizeRamo(texto, CATALOGO)).toEqual({
        ramoPaiId: null,
        nome: null,
        confianca: 'baixa',
      });
    });
  });

  describe('texto vazio e ausente', () => {
    it.each([
      ['string vazia', ''],
      ['só espaços', '   '],
      ['só pontuação', ' - | / '],
      ['só palavra de ligação', 'setor de'],
    ])('devolve baixa para %s', (_rotulo, texto) => {
      expect(normalizeRamo(texto, CATALOGO)).toEqual({
        ramoPaiId: null,
        nome: null,
        confianca: 'baixa',
      });
    });

    it.each([
      ['null', null],
      ['undefined', undefined],
    ])('devolve baixa para %s', (_rotulo, texto) => {
      expect(normalizeRamo(texto, CATALOGO).confianca).toBe('baixa');
    });
  });

  describe('acento, caixa, plural e ordem das palavras', () => {
    it.each([
      ['industria farmaceutica', 'Indústria Farmacêutica'],
      ['INDÚSTRIA QUÍMICA', 'Indústria Química'],
      ['eDUCAçãO', 'Educação'],
      ['Transporte e Logistica', 'Transportes e Logística'],
      ['Alimentícia Indústria', 'Indústria Alimentícia'],
      ['Farmacêutica | Indústria', 'Indústria Farmacêutica'],
      ['setor de energia', 'Energia'],
      ['Holding', 'Holdings'],
    ])('casa %s com %s', (texto, esperado) => {
      const resultado = normalizeRamo(texto, CATALOGO);
      expect(resultado.nome).toBe(esperado);
      expect(resultado.confianca).toBe('alta');
      expect(resultado.ramoPaiId).toBe(idDe(esperado));
    });
  });
});

describe('chaveRamo', () => {
  it('ignora acento, caixa, pontuação, plural e ordem', () => {
    expect(chaveRamo('Indústria Alimentícia')).toBe(chaveRamo('alimenticias | INDUSTRIA'));
    expect(chaveRamo('Transportes e Logística')).toBe(chaveRamo('logistica e transporte'));
  });

  it('resolve plurais irregulares do vocabulário', () => {
    expect(chaveRamo('Embalagens')).toBe(chaveRamo('embalagem'));
    expect(chaveRamo('Combustíveis')).toBe(chaveRamo('combustivel'));
    expect(chaveRamo('Construções')).toBe(chaveRamo('construcao'));
    expect(chaveRamo('Materiais')).toBe(chaveRamo('material'));
  });

  it('não encurta tokens de até três letras', () => {
    expect(chaveRamo('Gás')).toBe('gas');
    expect(chaveRamo('TI')).toBe('ti');
    expect(chaveRamo('Aço')).toBe('aco');
  });
});
