import { describe, expect, it } from 'vitest';
import {
  ANON_EXPOSURE_SEM_DADOS,
  agruparViolacoes,
  descreverExecucao,
  descreverVariacao,
  filtrarViolacoes,
  normalizarViolacao,
  normalizarViolacoes,
  ordenarSnapshots,
  resumirExposicao,
  rotuloTipoObjeto,
  variacoesPorSnapshot,
  type AnonAuditSnapshot,
} from '../anonExposure';

function violacao(objectName: string, objectKind = 'view', issue = 'fora do contrato') {
  return { objectName, objectKind, issue };
}

function snapshot(over: Partial<AnonAuditSnapshot> = {}): AnonAuditSnapshot {
  return {
    id: over.id ?? 1,
    checkedAt: over.checkedAt ?? '2026-11-26T12:00:00.000Z',
    violationCount: over.violationCount ?? 0,
    violations: over.violations ?? [],
  };
}

describe('normalizarViolacao', () => {
  it('aceita o formato da RPC quando os três campos são texto não vazio', () => {
    expect(
      normalizarViolacao({ object_name: 'v_products_complete', object_kind: 'view', issue: 'x' }),
    ).toEqual({ objectName: 'v_products_complete', objectKind: 'view', issue: 'x' });
  });

  it('recusa não-objetos, arrays e registros incompletos', () => {
    expect(normalizarViolacao(null)).toBeNull();
    expect(normalizarViolacao('view')).toBeNull();
    expect(normalizarViolacao([{ object_name: 'a', object_kind: 'view', issue: 'x' }])).toBeNull();
    expect(normalizarViolacao({ object_name: 'a', issue: 'x' })).toBeNull();
    expect(normalizarViolacao({ object_name: 'a', object_kind: 'view' })).toBeNull();
  });

  it('recusa campos em branco e não-texto', () => {
    expect(normalizarViolacao({ object_name: '   ', object_kind: 'view', issue: 'x' })).toBeNull();
    expect(normalizarViolacao({ object_name: 7, object_kind: 'view', issue: 'x' })).toBeNull();
  });
});

describe('normalizarViolacoes', () => {
  it('devolve [] para qualquer valor que não seja array', () => {
    expect(normalizarViolacoes(null)).toEqual([]);
    expect(normalizarViolacoes(undefined)).toEqual([]);
    expect(normalizarViolacoes({})).toEqual([]);
    expect(normalizarViolacoes('[]')).toEqual([]);
  });

  it('descarta só os itens inválidos de um array misto', () => {
    const saida = normalizarViolacoes([
      { object_name: 'a', object_kind: 'view', issue: 'p1' },
      null,
      { object_name: 'b' },
      { object_name: 'c', object_kind: 'table', issue: 'p2' },
    ]);
    expect(saida.map((v) => v.objectName)).toEqual(['a', 'c']);
  });
});

describe('rotuloTipoObjeto', () => {
  it('traduz tipos conhecidos ignorando a caixa', () => {
    expect(rotuloTipoObjeto('VIEW')).toBe('View');
    expect(rotuloTipoObjeto('matview')).toBe('Materialized view');
    expect(rotuloTipoObjeto('Table')).toBe('Tabela');
  });

  it('preserva o tipo desconhecido como veio', () => {
    expect(rotuloTipoObjeto('foreign_table')).toBe('foreign_table');
  });
});

describe('agruparViolacoes', () => {
  it('conta por tipo e deduplica objetos e problemas', () => {
    const grupos = agruparViolacoes([
      violacao('v_a', 'view', 'p1'),
      violacao('v_a', 'view', 'p2'),
      violacao('v_b', 'view', 'p1'),
    ]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0]).toMatchObject({ kind: 'view', label: 'View', total: 3 });
    expect(grupos[0].objetos).toEqual(['v_a', 'v_b']);
    expect(grupos[0].issues).toEqual(['p1', 'p2']);
  });

  it('ordena do maior total para o menor e desempata pelo rótulo', () => {
    const grupos = agruparViolacoes([
      violacao('f', 'function'),
      violacao('t', 'table'),
      violacao('v1', 'view'),
      violacao('v2', 'view'),
    ]);
    expect(grupos.map((g) => g.kind)).toEqual(['view', 'function', 'table']);
  });

  it('devolve [] sem violações', () => {
    expect(agruparViolacoes([])).toEqual([]);
  });
});

describe('filtrarViolacoes', () => {
  const lista = [
    violacao('v_products_complete', 'view', 'coluna sensível'),
    violacao('t_x', 'table', 'grant para anon'),
  ];

  it('devolve a mesma lista quando o termo está vazio ou só com espaços', () => {
    expect(filtrarViolacoes(lista, '')).toBe(lista);
    expect(filtrarViolacoes(lista, '   ')).toBe(lista);
  });

  it('busca por objeto, tipo e problema sem diferenciar caixa', () => {
    expect(filtrarViolacoes(lista, 'PRODUCTS').map((v) => v.objectName)).toEqual([
      'v_products_complete',
    ]);
    expect(filtrarViolacoes(lista, 'table').map((v) => v.objectName)).toEqual(['t_x']);
    expect(filtrarViolacoes(lista, 'grant').map((v) => v.objectName)).toEqual(['t_x']);
    expect(filtrarViolacoes(lista, 'nada-disso')).toEqual([]);
  });
});

describe('ordenarSnapshots', () => {
  it('coloca o mais recente primeiro', () => {
    const ordenados = ordenarSnapshots([
      snapshot({ id: 1, checkedAt: '2026-11-24T10:00:00.000Z' }),
      snapshot({ id: 2, checkedAt: '2026-11-26T10:00:00.000Z' }),
      snapshot({ id: 3, checkedAt: '2026-11-25T10:00:00.000Z' }),
    ]);
    expect(ordenados.map((s) => s.id)).toEqual([2, 3, 1]);
  });

  it('manda data inválida para o fim e desempata pelo id', () => {
    const ordenados = ordenarSnapshots([
      snapshot({ id: 1, checkedAt: 'sem-data' }),
      snapshot({ id: 7, checkedAt: '2026-11-26T10:00:00.000Z' }),
      snapshot({ id: 2, checkedAt: '' }),
    ]);
    expect(ordenados.map((s) => s.id)).toEqual([7, 2, 1]);
  });

  it('não muda o array original', () => {
    const original = [
      snapshot({ id: 1 }),
      snapshot({ id: 2, checkedAt: '2026-11-27T10:00:00.000Z' }),
    ];
    ordenarSnapshots(original);
    expect(original.map((s) => s.id)).toEqual([1, 2]);
  });
});

describe('variacoesPorSnapshot', () => {
  it('compara cada execução com a anterior e devolve o mais recente primeiro', () => {
    const saida = variacoesPorSnapshot([
      snapshot({ id: 1, checkedAt: '2026-11-24T10:00:00.000Z', violationCount: 5 }),
      snapshot({ id: 2, checkedAt: '2026-11-25T10:00:00.000Z', violationCount: 3 }),
      snapshot({ id: 3, checkedAt: '2026-11-26T10:00:00.000Z', violationCount: 4 }),
    ]);
    expect(saida.map((item) => item.snapshot.id)).toEqual([3, 2, 1]);
    expect(saida.map((item) => item.variacao)).toEqual([1, -2, null]);
  });

  it('devolve [] sem snapshots', () => {
    expect(variacoesPorSnapshot([])).toEqual([]);
  });
});

describe('descreverVariacao', () => {
  it('cobre os quatro ramos', () => {
    expect(descreverVariacao(null)).toBe('Primeira verificação registrada');
    expect(descreverVariacao(0)).toBe('Sem mudança desde a verificação anterior');
    expect(descreverVariacao(3)).toContain('3 nova(s)');
    expect(descreverVariacao(-2)).toContain('2 violação(ões) resolvida(s)');
  });
});

describe('descreverExecucao', () => {
  it('descreve sucesso e falha da RPC', () => {
    expect(descreverExecucao(0)).toContain('intacto');
    expect(descreverExecucao(12)).toContain('12 objeto(s)');
  });
});

describe('resumirExposicao', () => {
  it('devolve o resumo neutro quando não há histórico', () => {
    expect(resumirExposicao([])).toEqual(ANON_EXPOSURE_SEM_DADOS);
  });

  it('resume o snapshot mais recente e calcula a variação', () => {
    const resumo = resumirExposicao([
      snapshot({ id: 1, checkedAt: '2026-11-24T10:00:00.000Z', violationCount: 0 }),
      snapshot({
        id: 2,
        checkedAt: '2026-11-26T10:00:00.000Z',
        violationCount: 3,
        violations: [
          violacao('v_products_complete', 'view', 'coluna sensível'),
          violacao('v_monthly_costs', 'view', 'custo exposto'),
          violacao('t_x', 'table', 'grant para anon'),
        ],
      }),
    ]);
    expect(resumo.saudavel).toBe(false);
    expect(resumo.violacoesAtuais).toBe(3);
    expect(resumo.objetosDistintos).toBe(3);
    expect(resumo.tiposDeObjeto).toBe(2);
    expect(resumo.snapshots).toBe(2);
    expect(resumo.piorContagem).toBe(3);
    expect(resumo.variacao).toBe(3);
    expect(resumo.ultimaVerificacao).toBe('2026-11-26T10:00:00.000Z');
  });

  it('marca como saudável e sem variação quando só existe um snapshot limpo', () => {
    const resumo = resumirExposicao([snapshot({ violationCount: 0 })]);
    expect(resumo.saudavel).toBe(true);
    expect(resumo.variacao).toBeNull();
    expect(resumo.piorContagem).toBe(0);
  });
});
