/**
 * Contrato da tela /admin/cadastros?tab=ramos (lib pura).
 *
 * Cobre o que quebra a operação sem barulho:
 *   1. Slug gerado sem acento/hífen duplo e sem colidir com o índice UNIQUE.
 *   2. Validação recusa o que o banco recusaria (nome vazio, slot duplicado,
 *      cor fora de VARCHAR(7), ordem não inteira) e aplica os defaults.
 *   3. Árvore ramo -> segmentos ordenada por `ordem`/nome.
 *   4. Busca casa segmento e recorta o resultado; inativos respeitam o toggle.
 *   5. Resumo separa ativo/inativo e ramos sem segmento.
 *   6. Aviso de exclusão nomeia o cascade (segmentos + vínculos de produto).
 */
import { describe, it, expect } from 'vitest';
import type { RamoAtividade, RamoAtividadeFilho } from '@/types/ramo-atividade';
import {
  RAMO_COR_PADRAO,
  RAMO_ICONE_PADRAO,
  descreverImpacto,
  filtrarArvore,
  impactoExclusaoRamo,
  impactoExclusaoSegmento,
  isHexColor,
  montarArvore,
  proximaOrdem,
  resumirRamos,
  slugify,
  sugerirSlug,
  validarRamo,
  validarSegmento,
  valoresIniciaisRamo,
  valoresIniciaisSegmento,
  type RamoFormValues,
  type SegmentoFormValues,
} from '@/lib/crm/ramos-catalogo';

const RAMO: RamoAtividade = {
  id: 'ramo-1',
  nome: 'Alimentação',
  slug: 'alimentacao',
  descricao: null,
  icone: 'utensils',
  cor: '#f59e0b',
  ativo: true,
  ordem: 1,
};

function segmento(over: Partial<RamoAtividadeFilho>): RamoAtividadeFilho {
  return {
    id: 'seg-1',
    ramo_atividade_id: 'ramo-1',
    nome: 'Padaria',
    slug: 'padaria',
    descricao: null,
    icone: null,
    ativo: true,
    ordem: 1,
    ...over,
  };
}

function ramoForm(over: Partial<RamoFormValues> = {}): RamoFormValues {
  return {
    nome: 'Papelaria',
    slug: '',
    descricao: '  Material de escritório  ',
    icone: '',
    cor: '',
    ativo: true,
    ordem: '7',
    ...over,
  };
}

function segmentoForm(over: Partial<SegmentoFormValues> = {}): SegmentoFormValues {
  return {
    ramoId: 'ramo-1',
    nome: 'Papel A4',
    slug: '',
    descricao: '',
    icone: '',
    ativo: true,
    ordem: '',
    ...over,
  };
}

describe('slugify', () => {
  it('remove acentos, colapsa separadores e apara as pontas', () => {
    expect(slugify('Alimentação & Bebidas')).toBe('alimentacao-bebidas');
    expect(slugify('  Loja   de Roupas  ')).toBe('loja-de-roupas');
    expect(slugify('---')).toBe('');
  });
});

describe('sugerirSlug', () => {
  it('devolve o slug base quando está livre', () => {
    expect(sugerirSlug('Papelaria', ['alimentacao'])).toBe('papelaria');
  });

  it('desvia do índice UNIQUE global com sufixo numérico', () => {
    expect(sugerirSlug('Padaria', ['padaria'])).toBe('padaria-2');
    expect(sugerirSlug('Padaria', ['padaria', 'padaria-2'])).toBe('padaria-3');
    expect(sugerirSlug('PADARIA', ['padaria'])).toBe('padaria-2');
  });
});

describe('proximaOrdem', () => {
  it('devolve 1 para lista vazia e o maior + 1 caso contrário', () => {
    expect(proximaOrdem([])).toBe(1);
    expect(proximaOrdem([{ ordem: 1 }, { ordem: 9 }, { ordem: 4 }])).toBe(10);
  });
});

describe('validarRamo', () => {
  it('normaliza nome, gera slug pelo nome, apara descrição e aplica defaults', () => {
    const resultado = validarRamo(ramoForm(), { slugsOcupados: [] });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valores).toEqual({
      nome: 'Papelaria',
      slug: 'papelaria',
      descricao: 'Material de escritório',
      icone: RAMO_ICONE_PADRAO,
      cor: RAMO_COR_PADRAO,
      ativo: true,
      ordem: 7,
    });
  });

  it('recusa nome vazio, cor fora do hex e ordem inválida', () => {
    const resultado = validarRamo(ramoForm({ nome: '   ', cor: 'azul', ordem: 'abc' }), {
      slugsOcupados: [],
    });
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erros.nome).toMatch(/nome do ramo/i);
    expect(resultado.erros.cor).toMatch(/hexadecimal/i);
    expect(resultado.erros.ordem).toMatch(/inteiro/i);
  });

  it('recusa slug já usado por outro ramo (nome do índice é global)', () => {
    const resultado = validarRamo(ramoForm({ slug: 'alimentacao' }), {
      slugsOcupados: ['ALIMENTACAO'],
    });
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erros.slug).toMatch(/já existe outro ramo/i);
  });

  it('recusa slug com formato inválido', () => {
    const resultado = validarRamo(ramoForm({ slug: 'loja de roupas' }), { slugsOcupados: [] });
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erros.slug).toMatch(/minúsculas/i);
  });

  it('trata ordem vazia como 0 e descrição vazia como null', () => {
    const resultado = validarRamo(ramoForm({ ordem: '', descricao: '   ' }), { slugsOcupados: [] });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valores.ordem).toBe(0);
    expect(resultado.valores.descricao).toBeNull();
  });
});

describe('validarSegmento', () => {
  it('exige ramo pai existente', () => {
    const resultado = validarSegmento(segmentoForm({ ramoId: 'ramo-fantasma' }), {
      ramosConhecidos: ['ramo-1'],
      slugsOcupados: [],
    });
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erros.ramoId).toMatch(/recarregue/i);
  });

  it('grava ícone nulo quando vazio e devolve o ramo escolhido', () => {
    const resultado = validarSegmento(segmentoForm(), {
      ramosConhecidos: ['ramo-1'],
      slugsOcupados: [],
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valores).toEqual({
      ramo_atividade_id: 'ramo-1',
      nome: 'Papel A4',
      slug: 'papel-a4',
      descricao: null,
      icone: null,
      ativo: true,
      ordem: 0,
    });
  });

  it('recusa slug já usado por segmento de outro ramo', () => {
    const resultado = validarSegmento(segmentoForm({ slug: 'padaria' }), {
      ramosConhecidos: ['ramo-1'],
      slugsOcupados: ['padaria'],
    });
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erros.slug).toMatch(/já existe outro segmento/i);
  });
});

describe('montarArvore', () => {
  it('agrupa por ramo e ordena por ordem e nome', () => {
    const ramos: RamoAtividade[] = [RAMO, { ...RAMO, id: 'ramo-2', nome: 'Automotivo', ordem: 0 }];
    const segmentos: RamoAtividadeFilho[] = [
      segmento({ id: 's2', nome: 'Restaurante', ordem: 2 }),
      segmento({ id: 's1', nome: 'Padaria', ordem: 1 }),
      segmento({ id: 's3', ramo_atividade_id: 'ramo-2', nome: 'Auto peças', ordem: 5 }),
    ];

    const arvore = montarArvore(ramos, segmentos);
    expect(arvore.map((no) => no.ramo.id)).toEqual(['ramo-2', 'ramo-1']);
    expect(arvore[1].segmentos.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(arvore[1].segmentos).toHaveLength(2);
  });
});

describe('filtrarArvore', () => {
  const arvore = montarArvore(
    [RAMO, { ...RAMO, id: 'ramo-2', nome: 'Serviços', ativo: false, slug: 'servicos' }],
    [
      segmento({ id: 's1', nome: 'Padaria', slug: 'padaria' }),
      segmento({ id: 's2', nome: 'Bar', slug: 'bar', ativo: false }),
      segmento({ id: 's3', ramo_atividade_id: 'ramo-2', nome: 'Gráfica', slug: 'grafica' }),
    ],
  );

  it('sem busca devolve tudo, respeitando o toggle de inativos', () => {
    const tudo = filtrarArvore(arvore, { busca: '', incluirInativos: true });
    expect(tudo).toHaveLength(2);
    // `ordem` empatada nos dois ramos: desempate por nome (Alimentação < Serviços).
    expect(tudo.map((no) => no.ramo.id)).toEqual(['ramo-1', 'ramo-2']);
    expect(tudo[0].segmentos).toHaveLength(2);
    expect(tudo[1].segmentos).toHaveLength(1);

    const soAtivos = filtrarArvore(arvore, { busca: '', incluirInativos: false });
    expect(soAtivos.map((no) => no.ramo.id)).toEqual(['ramo-1']);
    expect(soAtivos[0].segmentos.map((s) => s.id)).toEqual(['s1']);
  });

  it('busca por segmento mantém o ramo pai e recorta os irmãos', () => {
    const resultado = filtrarArvore(arvore, { busca: 'padaria', incluirInativos: true });
    expect(resultado).toHaveLength(1);
    expect(resultado[0].ramo.id).toBe('ramo-1');
    expect(resultado[0].segmentos.map((s) => s.id)).toEqual(['s1']);
  });

  it('busca por ramo devolve o ramo com todos os segmentos visíveis', () => {
    const resultado = filtrarArvore(arvore, { busca: 'alimentação', incluirInativos: true });
    expect(resultado).toHaveLength(1);
    expect(resultado[0].segmentos).toHaveLength(2);
  });

  it('busca sem correspondência devolve lista vazia', () => {
    expect(filtrarArvore(arvore, { busca: 'zzz', incluirInativos: true })).toEqual([]);
  });
});

describe('resumirRamos', () => {
  it('separa ativos de inativos e conta ramos sem segmento', () => {
    const arvore = montarArvore(
      [RAMO, { ...RAMO, id: 'ramo-2', ativo: false }, { ...RAMO, id: 'ramo-3', nome: 'Vazio' }],
      [segmento({ id: 's1' }), segmento({ id: 's2', ativo: false })],
    );
    expect(resumirRamos(arvore)).toEqual({
      ramos: 3,
      ramosAtivos: 2,
      ramosInativos: 1,
      segmentos: 2,
      segmentosAtivos: 1,
      segmentosInativos: 1,
      ramosSemSegmento: 2,
    });
  });
});

describe('impacto de exclusão', () => {
  const produtosPorSegmento = new Map<string, number>([
    ['s1', 120],
    ['s2', 34],
  ]);

  it('soma vínculos de produto dos segmentos do ramo', () => {
    const impacto = impactoExclusaoRamo(
      [segmento({ id: 's1' }), segmento({ id: 's2', ativo: false })],
      produtosPorSegmento,
    );
    expect(impacto).toEqual({ segmentos: 2, segmentosAtivos: 1, produtos: 154 });
  });

  it('ignora segmento sem vínculo contado', () => {
    const impacto = impactoExclusaoRamo([segmento({ id: 's9' })], produtosPorSegmento);
    expect(impacto.produtos).toBe(0);
  });

  it('descreve o cascade com singular, plural e aviso de irreversibilidade', () => {
    const ramo = descreverImpacto({ segmentos: 1, segmentosAtivos: 1, produtos: 1 }, 'ramo');
    expect(ramo[0]).toMatch(/^1 segmento é apagado/);
    expect(ramo[1]).toMatch(/^1 segmento ativo deixa/);
    expect(ramo[2]).toMatch(/^1 vínculo de produto é apagado/);
    expect(ramo[3]).toMatch(/não pode ser desfeita/);

    const varios = descreverImpacto({ segmentos: 3, segmentosAtivos: 0, produtos: 1540 }, 'ramo');
    expect(varios[0]).toMatch(/^3 segmentos são apagados/);
    expect(varios[1]).toMatch(/^1\.540 vínculos de produto são apagados/);
  });

  it('avisa quando nada está ligado', () => {
    const linhas = descreverImpacto({ segmentos: 0, segmentosAtivos: 0, produtos: 0 }, 'ramo');
    expect(linhas[0]).toMatch(/nenhum segmento/i);
    expect(linhas[1]).toMatch(/nenhum produto/i);
  });

  it('no segmento não fala de segmentos filhos', () => {
    const linhas = descreverImpacto(impactoExclusaoSegmento(7), 'segmento');
    expect(linhas).toEqual([
      '7 vínculos de produto são apagados — o produto fica sem este nicho.',
      'Esta ação não pode ser desfeita.',
    ]);
  });
});

describe('valores iniciais dos formulários', () => {
  it('cria ramo vazio com cor e ícone padrão', () => {
    expect(valoresIniciaisRamo(undefined, 5)).toEqual({
      nome: '',
      slug: '',
      descricao: '',
      icone: RAMO_ICONE_PADRAO,
      cor: RAMO_COR_PADRAO,
      ativo: true,
      ordem: '5',
    });
  });

  it('edita ramo existente preservando os campos atuais', () => {
    expect(valoresIniciaisRamo(RAMO, 5)).toEqual({
      nome: 'Alimentação',
      slug: 'alimentacao',
      descricao: '',
      icone: 'utensils',
      cor: '#f59e0b',
      ativo: true,
      ordem: '1',
    });
  });

  it('cria segmento já apontando para o ramo do contexto', () => {
    expect(valoresIniciaisSegmento('ramo-9', undefined, 2).ramoId).toBe('ramo-9');
    expect(valoresIniciaisSegmento('ramo-9', segmento({ id: 's1' }), 2).ramoId).toBe('ramo-1');
  });
});

describe('isHexColor', () => {
  it('aceita 6 dígitos com ou sem caixa alta e recusa o resto', () => {
    expect(isHexColor('#6366F1')).toBe(true);
    expect(isHexColor('6366f1')).toBe(false);
    expect(isHexColor('#6366f')).toBe(false);
    expect(isHexColor('rgb(1,2,3)')).toBe(false);
  });
});
