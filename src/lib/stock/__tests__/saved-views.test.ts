import { describe, expect, it } from 'vitest';
import {
  STOCK_VIEW_NAME_MAX_LENGTH,
  STOCK_VIEW_NAME_MIN_LENGTH,
  describeFilters,
  describeSavedStockViewError,
  formatViewUsage,
  normalizeFilters,
  normalizeViewName,
  parseSavedStockView,
  parseSavedStockViews,
  serializeFilters,
  sortSavedStockViews,
  validateSavedStockViewName,
  type SavedStockViewRow,
} from '../saved-views';

const row = (over: Partial<SavedStockViewRow> = {}): SavedStockViewRow => ({
  id: 'view-1',
  user_id: 'user-1',
  name: 'Ruptura Sul',
  description: null,
  filters: { activeLevel: 'alto' },
  is_pinned: false,
  use_count: 0,
  created_at: '2026-11-26T13:00:00.000Z',
  updated_at: '2026-11-26T13:00:00.000Z',
  ...over,
});

describe('normalizeViewName', () => {
  it('colapsa espacos e apara as pontas', () => {
    expect(normalizeViewName('   Ruptura   critica  ')).toBe('Ruptura critica');
  });

  it('devolve string vazia quando so ha espaco', () => {
    expect(normalizeViewName('   ')).toBe('');
  });
});

describe('normalizeFilters', () => {
  it('le o nivel ativo do jsonb', () => {
    expect(normalizeFilters({ activeLevel: ' critico ' })).toEqual({ activeLevel: 'critico' });
  });

  it('trata valor ausente, nulo, vazio ou nao-texto como sem filtro', () => {
    expect(normalizeFilters({})).toEqual({ activeLevel: null });
    expect(normalizeFilters({ activeLevel: null })).toEqual({ activeLevel: null });
    expect(normalizeFilters({ activeLevel: '   ' })).toEqual({ activeLevel: null });
    expect(normalizeFilters({ activeLevel: 3 })).toEqual({ activeLevel: null });
  });

  it('tolera payload que nao e objeto', () => {
    expect(normalizeFilters(null)).toEqual({ activeLevel: null });
    expect(normalizeFilters('alto')).toEqual({ activeLevel: null });
    expect(normalizeFilters(['alto'])).toEqual({ activeLevel: null });
  });
});

describe('serializeFilters / describeFilters', () => {
  it('serializa apenas o nivel ativo', () => {
    expect(serializeFilters({ activeLevel: 'medio' })).toEqual({ activeLevel: 'medio' });
  });

  it('descreve o filtro para o operador', () => {
    expect(describeFilters({ activeLevel: 'alto' })).toBe('nível alto');
    expect(describeFilters({ activeLevel: null })).toBe('todos os níveis');
  });
});

describe('parseSavedStockView', () => {
  it('normaliza um registro completo do PostgREST', () => {
    const parsed = parseSavedStockView({
      id: 'view-1',
      user_id: 'user-1',
      name: '  Ruptura   Sul ',
      description: '  foco sul ',
      filters: { activeLevel: 'alto' },
      is_pinned: true,
      use_count: 7.8,
      created_at: '2026-11-26T13:00:00.000Z',
    });
    expect(parsed).toEqual({
      id: 'view-1',
      user_id: 'user-1',
      name: 'Ruptura Sul',
      description: 'foco sul',
      filters: { activeLevel: 'alto' },
      is_pinned: true,
      use_count: 7,
      created_at: '2026-11-26T13:00:00.000Z',
      updated_at: '2026-11-26T13:00:00.000Z',
    });
  });

  it('descarta registro sem id, usuario, nome ou created_at', () => {
    expect(parseSavedStockView(null)).toBeNull();
    expect(parseSavedStockView('x')).toBeNull();
    expect(parseSavedStockView({ user_id: 'u', name: 'n', created_at: 'c' })).toBeNull();
    expect(parseSavedStockView({ id: 'i', name: 'n', created_at: 'c' })).toBeNull();
    expect(parseSavedStockView({ id: 'i', user_id: 'u', created_at: 'c' })).toBeNull();
    expect(parseSavedStockView({ id: 'i', user_id: 'u', name: '  ', created_at: 'c' })).toBeNull();
    expect(parseSavedStockView({ id: 'i', user_id: 'u', name: 'n' })).toBeNull();
  });

  it('assume zeros seguros quando use_count vem invalido', () => {
    const parsed = parseSavedStockView({
      id: 'i',
      user_id: 'u',
      name: 'n',
      created_at: 'c',
      use_count: -4,
    });
    expect(parsed?.use_count).toBe(0);
    expect(parsed?.is_pinned).toBe(false);
    expect(parsed?.description).toBeNull();
  });
});

describe('sortSavedStockViews', () => {
  it('coloca fixadas antes e ordena por nome', () => {
    const sorted = sortSavedStockViews([
      row({ id: 'b', name: 'Beta' }),
      row({ id: 'z', name: 'Zulu', is_pinned: true }),
      row({ id: 'a', name: 'alfa' }),
    ]);
    expect(sorted.map((v) => v.id)).toEqual(['z', 'a', 'b']);
  });

  it('nao muta o array recebido', () => {
    const input = [row({ id: 'b', name: 'Beta' }), row({ id: 'a', name: 'Alfa' })];
    const sorted = sortSavedStockViews(input);
    expect(input.map((v) => v.id)).toEqual(['b', 'a']);
    expect(sorted.map((v) => v.id)).toEqual(['a', 'b']);
  });
});

describe('parseSavedStockViews', () => {
  it('filtra registros invalidos e entrega ordenado', () => {
    const parsed = parseSavedStockViews([
      { id: 'i1', user_id: 'u', name: 'Zeta', created_at: 'c' },
      null,
      { id: 'i2', user_id: 'u', name: 'Alfa', created_at: 'c', is_pinned: true },
      { broken: true },
    ]);
    expect(parsed.map((v) => v.name)).toEqual(['Alfa', 'Zeta']);
  });

  it('devolve lista vazia quando o payload nao e array', () => {
    expect(parseSavedStockViews(null)).toEqual([]);
    expect(parseSavedStockViews({ data: [] })).toEqual([]);
  });
});

describe('validateSavedStockViewName', () => {
  it('recusa nome vazio', () => {
    expect(validateSavedStockViewName('   ', [])).toEqual({
      ok: false,
      error: 'Informe um nome para a view.',
    });
  });

  it('recusa nome curto demais', () => {
    const result = validateSavedStockViewName('ab', []);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(String(STOCK_VIEW_NAME_MIN_LENGTH));
  });

  it('recusa nome longo demais', () => {
    const result = validateSavedStockViewName('a'.repeat(STOCK_VIEW_NAME_MAX_LENGTH + 1), []);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(String(STOCK_VIEW_NAME_MAX_LENGTH));
  });

  it('recusa duplicata ignorando caixa e espacos', () => {
    const result = validateSavedStockViewName('  ruptura   SUL ', [row({ name: 'Ruptura Sul' })]);
    expect(result).toEqual({ ok: false, error: 'Já existe uma view com esse nome.' });
  });

  it('aceita nome novo e devolve o valor normalizado', () => {
    expect(validateSavedStockViewName('  Ruptura   Crítica  ', [row()])).toEqual({
      ok: true,
      value: 'Ruptura Crítica',
    });
  });
});

describe('formatViewUsage', () => {
  it('descreve o contador de uso', () => {
    expect(formatViewUsage(0)).toBe('nunca aplicada');
    expect(formatViewUsage(-1)).toBe('nunca aplicada');
    expect(formatViewUsage(1)).toBe('aplicada 1 vez');
    expect(formatViewUsage(12)).toBe('aplicada 12 vezes');
  });
});

describe('describeSavedStockViewError', () => {
  it('traduz a violacao de nome unico', () => {
    expect(describeSavedStockViewError({ code: '23505', message: 'duplicate key' })).toBe(
      'Já existe uma view com esse nome.',
    );
  });

  it('traduz falta de permissao e usuario invalido', () => {
    expect(describeSavedStockViewError({ code: '42501' })).toBe(
      'Sem permissão para alterar views salvas.',
    );
    expect(describeSavedStockViewError({ code: '23503' })).toBe(
      'Sessão inválida: usuário não encontrado.',
    );
  });

  it('explica tabela ausente (migration pendente)', () => {
    expect(
      describeSavedStockViewError({ message: 'relation "public.saved_stock_views" does not exist' }),
    ).toContain('migration 20261126130000');
  });

  it('explica sessao expirada', () => {
    expect(describeSavedStockViewError({ message: 'JWT expired' })).toContain('Sessão expirada');
  });

  it('usa Error, string e mensagem crua quando nao ha codigo conhecido', () => {
    expect(describeSavedStockViewError(new Error('falha de rede'))).toBe('falha de rede');
    expect(describeSavedStockViewError('sem conexao')).toBe('sem conexao');
  });

  it('cai na mensagem generica quando o erro nao traz nada', () => {
    expect(describeSavedStockViewError(null)).toBe(
      'Não foi possível concluir a operação com views salvas.',
    );
    expect(describeSavedStockViewError(undefined)).toBe(
      'Não foi possível concluir a operação com views salvas.',
    );
  });
});
