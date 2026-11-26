import { describe, expect, it } from 'vitest';
import {
  agruparPorCategoria,
  categoriaLabel,
  describeAnonAccessError,
  ordenarAnonAccess,
  parseAnonAccessRows,
  resumirAnonAccess,
  severidadeLabel,
  severidadeRank,
  type AnonAccessRow,
} from '../anonAccessAudit';

function linha(over: Partial<AnonAccessRow> = {}): AnonAccessRow {
  return {
    categoria: over.categoria ?? 'VIEW_SENSIVEL_ANON',
    objeto: over.objeto ?? 'v_monthly_costs',
    anonGrant: over.anonGrant ?? true,
    authGrant: over.authGrant ?? true,
    severidade: over.severidade ?? 'HIGH',
    descricao: over.descricao ?? 'view interna acessivel por anon',
  };
}

describe('parseAnonAccessRows', () => {
  it('devolve lista vazia quando a resposta nao e array', () => {
    expect(parseAnonAccessRows(null)).toEqual([]);
    expect(parseAnonAccessRows({ categoria: 'X' })).toEqual([]);
    expect(parseAnonAccessRows(undefined)).toEqual([]);
  });

  it('ignora itens invalidos e objetos sem nome', () => {
    const rows = parseAnonAccessRows(['texto', 42, { categoria: 'A' }, { objeto: '   ' }]);
    expect(rows).toEqual([]);
  });

  it('normaliza severidade e categoria', () => {
    const rows = parseAnonAccessRows([
      { categoria: '', objeto: 'quotes', severidade: 'high', anon_grant: true },
      { categoria: 'RLS_SEM_POLICY', objeto: 'orders' },
    ]);
    expect(rows[0]).toEqual({
      categoria: 'SEM_CATEGORIA',
      objeto: 'quotes',
      anonGrant: true,
      authGrant: false,
      severidade: 'HIGH',
      descricao: '',
    });
    expect(rows[1].severidade).toBe('INFO');
    expect(rows[1].anonGrant).toBe(false);
  });

  it('so aceita true estrito para os grants', () => {
    const [row] = parseAnonAccessRows([
      { objeto: 'x', anon_grant: 'true', auth_grant: 1, severidade: 'INFO' },
    ]);
    expect(row.anonGrant).toBe(false);
    expect(row.authGrant).toBe(false);
  });
});

describe('rotulos de categoria e severidade', () => {
  it('traduz as quatro categorias do diagnostico', () => {
    expect(categoriaLabel('RLS_SEM_POLICY')).toContain('sem nenhuma policy');
    expect(categoriaLabel('FUNC_SEM_EXECUTE_ANON')).toContain('EXECUTE');
    expect(categoriaLabel('VIEW_SENSIVEL_ANON')).toContain('View');
    expect(categoriaLabel('BADGE_TABLE_SEM_ANON_GRANT')).toContain('badge');
  });

  it('humaniza categoria desconhecida', () => {
    expect(categoriaLabel('CATEGORIA_NOVA_QUALQUER')).toBe('categoria nova qualquer');
  });

  it('ordena e rotula severidade', () => {
    expect(severidadeRank('CRITICAL')).toBeGreaterThan(severidadeRank('HIGH'));
    expect(severidadeRank('HIGH')).toBeGreaterThan(severidadeRank('INFO'));
    expect(severidadeRank('DESCONHECIDA')).toBe(0);
    expect(severidadeLabel('critical')).toBe('Crítico');
    expect(severidadeLabel('HIGH')).toBe('Alto');
    expect(severidadeLabel('INFO')).toBe('Informativo');
    expect(severidadeLabel('OUTRO')).toBe('OUTRO');
  });
});

describe('ordenarAnonAccess', () => {
  it('coloca critico, alto e informativo nessa ordem, desempatando por objeto', () => {
    const rows = [
      linha({ objeto: 'b_view', severidade: 'HIGH' }),
      linha({ objeto: 'z_func', severidade: 'CRITICAL' }),
      linha({ objeto: 'a_view', severidade: 'HIGH' }),
      linha({ objeto: 'c_info', severidade: 'INFO' }),
    ];
    expect(ordenarAnonAccess(rows).map((r) => r.objeto)).toEqual([
      'z_func',
      'a_view',
      'b_view',
      'c_info',
    ]);
  });

  it('nao muta a lista original', () => {
    const rows = [linha({ severidade: 'INFO' }), linha({ severidade: 'CRITICAL', objeto: 'z' })];
    ordenarAnonAccess(rows);
    expect(rows[0].severidade).toBe('INFO');
  });
});

describe('agruparPorCategoria', () => {
  it('agrupa por categoria, mantem a pior severidade e ordena os grupos', () => {
    const rows = [
      linha({ categoria: 'RLS_SEM_POLICY', objeto: 'quotes', severidade: 'HIGH' }),
      linha({ categoria: 'RLS_SEM_POLICY', objeto: 'orders', severidade: 'INFO' }),
      linha({ categoria: 'FUNC_SEM_EXECUTE_ANON', objeto: 'fn_x()', severidade: 'CRITICAL' }),
    ];
    const grupos = agruparPorCategoria(rows);
    expect(grupos.map((g) => g.categoria)).toEqual(['FUNC_SEM_EXECUTE_ANON', 'RLS_SEM_POLICY']);
    expect(grupos[1].severidade).toBe('HIGH');
    expect(grupos[1].objetos).toEqual(['orders', 'quotes']);
    expect(grupos[1].descricao).toContain('view interna');
  });

  it('nao duplica objeto repetido na mesma categoria', () => {
    const rows = [linha({ objeto: 'quotes' }), linha({ objeto: 'quotes' })];
    expect(agruparPorCategoria(rows)[0].objetos).toEqual(['quotes']);
  });
});

describe('resumirAnonAccess', () => {
  it('conta criticos, altos, informativos e categorias', () => {
    const resumo = resumirAnonAccess([
      linha({ severidade: 'CRITICAL' }),
      linha({ severidade: 'HIGH', objeto: 'a' }),
      linha({ severidade: 'HIGH', objeto: 'b' }),
      linha({ severidade: 'INFO', objeto: 'c' }),
      linha({ severidade: 'INFO', objeto: 'd', categoria: 'RLS_SEM_POLICY' }),
    ]);
    expect(resumo).toEqual({
      total: 5,
      criticos: 1,
      altos: 2,
      informativos: 2,
      categorias: 2,
    });
  });

  it('resume lista vazia como ambiente saudavel', () => {
    expect(resumirAnonAccess([])).toEqual({
      total: 0,
      criticos: 0,
      altos: 0,
      informativos: 0,
      categorias: 0,
    });
  });
});

describe('describeAnonAccessError', () => {
  it('explica falta de permissao sem vazar a mensagem do banco', () => {
    const texto = describeAnonAccessError(new Error('42501 Acesso restrito a administradores.'));
    expect(texto).toContain('administrador');
    expect(texto).not.toContain('42501');
  });

  it('aponta a migration quando a funcao ainda nao existe', () => {
    expect(describeAnonAccessError({ message: 'PGRST202 could not find the function' })).toContain(
      '20261126192900',
    );
  });

  it('mostra a mensagem recebida quando for desconhecida', () => {
    expect(describeAnonAccessError({ message: 'boom' })).toContain('boom');
  });

  it('cai no texto generico sem erro e sem mensagem', () => {
    expect(describeAnonAccessError(undefined)).toContain('Tente novamente');
    expect(describeAnonAccessError({})).toContain('Tente novamente');
  });
});
