import { describe, expect, it } from 'vitest';
import {
  confidenceOf,
  describeApplyOutcome,
  describeClassificationError,
  formatarDataHora,
  hasConflict,
  isMinMatchesValid,
  normalizeMinMatches,
  parseApplyResult,
  parseClassificationSuggestions,
  parseClassificationSummary,
  resumirSuggestions,
  type ClassificationSuggestion,
} from '@/lib/admin/classificationAudit';

function sugestao(partial: Partial<ClassificationSuggestion> = {}): ClassificationSuggestion {
  return {
    id: 1,
    productId: 'p-1',
    sku: 'SKU-1',
    produto: 'Caneca',
    isKit: false,
    categoriaSugerida: 'Brindes > Canecas',
    nivel: 3,
    matches: 4,
    score: 10,
    tokensMatched: 'caneca',
    alreadyAssigned: false,
    categoriasAtuais: '',
    materialConflict: false,
    typeConflict: false,
    approvedAuto: true,
    computedAt: '2026-11-26T12:00:00Z',
    confianca: confidenceOf(4, 3),
    ...partial,
  };
}

describe('confidenceOf', () => {
  it('replica o CASE da view v_gaps_acionaveis', () => {
    expect(confidenceOf(5, 3).level).toBe('altissima');
    expect(confidenceOf(4, 1).level).toBe('altissima');
    expect(confidenceOf(3, 3).level).toBe('alta');
    expect(confidenceOf(2, 4).level).toBe('boa');
    expect(confidenceOf(2, 3).level).toBe('media');
    expect(confidenceOf(2, 2).level).toBe('baixa');
    expect(confidenceOf(1, 5).level).toBe('baixa');
    expect(confidenceOf(0, 0).level).toBe('baixa');
  });
});

describe('parseClassificationSummary', () => {
  it('lê a primeira linha devolvida pela RPC', () => {
    const resumo = parseClassificationSummary([
      {
        total_sugestoes: '12',
        nao_atribuidas: 7,
        kits_para_revisao: 2,
        conflitos: 3,
        alta_confianca: 4,
        ultima_analise: '2026-11-26T12:00:00Z',
      },
    ]);
    expect(resumo).toEqual({
      totalSugestoes: 12,
      naoAtribuidas: 7,
      kitsParaRevisao: 2,
      conflitos: 3,
      altaConfianca: 4,
      ultimaAnalise: '2026-11-26T12:00:00Z',
    });
  });

  it('devolve zero em payload vazio ou inválido', () => {
    expect(parseClassificationSummary(null).totalSugestoes).toBe(0);
    expect(parseClassificationSummary([]).ultimaAnalise).toBeNull();
    expect(parseClassificationSummary('erro').totalSugestoes).toBe(0);
  });
});

describe('parseClassificationSuggestions', () => {
  it('normaliza linhas e descarta item sem produto', () => {
    const linhas = parseClassificationSuggestions([
      {
        id: 9,
        product_id: 'p-9',
        sku: 'SKU-9',
        produto: 'Kit Caneca',
        is_kit: true,
        categoria_sugerida: 'Brindes > Kits',
        nivel: 2,
        matches: 3,
        score: 8,
        tokens_matched: 'kit',
        already_assigned: false,
        categorias_atuais: 'Kits',
        material_conflict: true,
        type_conflict: false,
        approved_auto: false,
        computed_at: '2026-11-26T10:00:00Z',
      },
      { id: 10 },
      null,
    ]);
    expect(linhas).toHaveLength(1);
    expect(linhas[0].isKit).toBe(true);
    expect(linhas[0].materialConflict).toBe(true);
    expect(linhas[0].confianca.level).toBe('alta');
  });

  it('tolera data inválida sem quebrar', () => {
    const linhas = parseClassificationSuggestions([
      { product_id: 'p-1', computed_at: '', matches: 1, nivel: 1 },
    ]);
    expect(linhas[0].computedAt).toBeNull();
  });
});

describe('resumirSuggestions e hasConflict', () => {
  it('conta gaps, kits, conflitos e alta confiança', () => {
    const resumo = resumirSuggestions([
      sugestao({ id: 1 }),
      sugestao({ id: 2, alreadyAssigned: true, matches: 3, confianca: confidenceOf(3, 3) }),
      sugestao({
        id: 3,
        isKit: true,
        typeConflict: true,
        matches: 2,
        confianca: confidenceOf(2, 3),
      }),
    ]);
    expect(resumo).toEqual({ total: 3, gaps: 2, conflitos: 1, kits: 1, altaConfianca: 1 });
  });

  it('detecta conflito quando qualquer flag está ligada', () => {
    expect(hasConflict({ materialConflict: true, typeConflict: false })).toBe(true);
    expect(hasConflict({ materialConflict: false, typeConflict: true })).toBe(true);
    expect(hasConflict({ materialConflict: false, typeConflict: false })).toBe(false);
  });
});

describe('parseApplyResult e describeApplyOutcome', () => {
  it('classifica os três desfechos possíveis', () => {
    expect(
      parseApplyResult([{ acao: 'DRY-RUN', product_id: 'p', matches: 4, score: 1 }])[0].acao,
    ).toBe('DRY-RUN');
    expect(parseApplyResult([{ acao: 'APLICADO' }])[0].acao).toBe('APLICADO');
    expect(parseApplyResult([{ acao: 'SEM MUDANCA' }])[0].acao).toBe('SEM MUDANCA');
    expect(parseApplyResult([{ acao: 'desconhecido' }])[0].acao).toBe('APLICADO');
  });

  it('descreve cada desfecho em linguagem de negócio', () => {
    expect(describeApplyOutcome([])).toContain('Nenhuma sugestão');
    expect(
      describeApplyOutcome([
        {
          acao: 'DRY-RUN',
          productId: 'p',
          sku: '',
          produto: '',
          categoria: '',
          matches: 4,
          score: 1,
        },
      ]),
    ).toContain('Nada foi gravado');
    expect(
      describeApplyOutcome([
        {
          acao: 'SEM MUDANCA',
          productId: 'p',
          sku: '',
          produto: '',
          categoria: '',
          matches: 4,
          score: 1,
        },
      ]),
    ).toContain('nenhuma atribuição nova');
    expect(
      describeApplyOutcome([
        {
          acao: 'APLICADO',
          productId: 'p',
          sku: '',
          produto: '',
          categoria: '',
          matches: 4,
          score: 1,
        },
      ]),
    ).toContain('criadas e registradas na auditoria');
  });
});

describe('validação de filtros e utilidades', () => {
  it('limita o mínimo de matches à faixa aceita pela RPC', () => {
    expect(isMinMatchesValid(1)).toBe(true);
    expect(isMinMatchesValid(20)).toBe(true);
    expect(isMinMatchesValid(0)).toBe(false);
    expect(isMinMatchesValid(21)).toBe(false);
    expect(isMinMatchesValid(2.5)).toBe(false);
    expect(normalizeMinMatches(0)).toBe(1);
    expect(normalizeMinMatches(99)).toBe(20);
    expect(normalizeMinMatches(Number.NaN)).toBe(2);
  });

  it('formata data ausente ou inválida como travessão', () => {
    expect(formatarDataHora(null)).toBe('—');
    expect(formatarDataHora('nao-e-data')).toBe('—');
    expect(formatarDataHora('2026-11-26T12:00:00Z')).not.toBe('—');
  });

  it('traduz os erros conhecidos do banco', () => {
    expect(describeClassificationError(new Error('Acesso restrito a administradores.'))).toContain(
      'permissão de administrador',
    );
    expect(describeClassificationError(new Error('Autenticacao obrigatoria.'))).toContain(
      'Sessão expirada',
    );
    expect(
      describeClassificationError(new Error('Parametro _min_matches fora da faixa 1..20')),
    ).toContain('entre 1 e 20');
    expect(
      describeClassificationError(new Error('PGRST202 could not find the function')),
    ).toContain('20261126211200');
    expect(describeClassificationError(new Error('boom'))).toContain('boom');
    expect(describeClassificationError(null)).toContain('Tente novamente');
  });
});
