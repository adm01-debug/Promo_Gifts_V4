import { describe, expect, it } from 'vitest';
import {
  STOCK_NOTE_MAX_LENGTH,
  STOCK_NOTE_MIN_LENGTH,
  describeStockNoteError,
  formatStockNoteAge,
  parseStockNote,
  parseStockNotes,
  sortStockNotes,
  summarizeStockNotes,
  validateStockNote,
  type StockNoteRow,
} from '@/lib/stock/stock-notes';

const BASE = {
  id: 'note-1',
  variant_id: 'variant-1',
  supplier_id: null,
  created_by: 'user-1',
  note: 'Repor 20 unidades antes da Black Friday',
  is_pinned: false,
  created_at: '2026-11-20T10:00:00.000Z',
  updated_at: '2026-11-20T10:00:00.000Z',
};

function row(overrides: Partial<StockNoteRow> = {}): StockNoteRow {
  return { ...BASE, ...overrides };
}

describe('parseStockNote', () => {
  it('lê a linha completa do PostgREST', () => {
    expect(parseStockNote(BASE)).toEqual(BASE);
  });

  it('normaliza supplier_id vazio para null e is_pinned ausente para false', () => {
    const parsed = parseStockNote({ ...BASE, supplier_id: '   ', is_pinned: 'sim' });
    expect(parsed?.supplier_id).toBeNull();
    expect(parsed?.is_pinned).toBe(false);
  });

  it('descarta datas inválidas sem quebrar o registro', () => {
    const parsed = parseStockNote({ ...BASE, created_at: 'ontem' });
    expect(parsed?.created_at).toBe('');
  });

  it('rejeita objeto sem id, variant_id, created_by ou note', () => {
    expect(parseStockNote({ ...BASE, id: null })).toBeNull();
    expect(parseStockNote({ ...BASE, variant_id: '' })).toBeNull();
    expect(parseStockNote({ ...BASE, created_by: undefined })).toBeNull();
    expect(parseStockNote({ ...BASE, note: 42 })).toBeNull();
  });

  it('rejeita valores que não são objeto, incluindo array', () => {
    expect(parseStockNote(null)).toBeNull();
    expect(parseStockNote([BASE])).toBeNull();
    expect(parseStockNote('nota')).toBeNull();
  });
});

describe('parseStockNotes', () => {
  it('mantém apenas linhas válidas', () => {
    const parsed = parseStockNotes([BASE, { id: 'x' }, { ...BASE, id: 'note-2' }]);
    expect(parsed.map((n) => n.id)).toEqual(['note-1', 'note-2']);
  });

  it('devolve lista vazia quando o payload não é array', () => {
    expect(parseStockNotes(null)).toEqual([]);
    expect(parseStockNotes({ data: [] })).toEqual([]);
  });
});

describe('sortStockNotes', () => {
  it('coloca fixadas primeiro e, dentro do grupo, a mais recente primeiro', () => {
    const notes = [
      row({ id: 'antiga', created_at: '2026-11-01T10:00:00.000Z' }),
      row({ id: 'fixada-antiga', is_pinned: true, created_at: '2026-10-01T10:00:00.000Z' }),
      row({ id: 'nova', created_at: '2026-11-25T10:00:00.000Z' }),
      row({ id: 'fixada-nova', is_pinned: true, created_at: '2026-11-10T10:00:00.000Z' }),
    ];
    expect(sortStockNotes(notes).map((n) => n.id)).toEqual([
      'fixada-nova',
      'fixada-antiga',
      'nova',
      'antiga',
    ]);
  });

  it('não muta o array original', () => {
    const notes = [
      row({ id: 'a', created_at: '2026-11-01T10:00:00.000Z' }),
      row({ id: 'b', created_at: '2026-11-05T10:00:00.000Z' }),
    ];
    const sorted = sortStockNotes(notes);
    expect(notes.map((n) => n.id)).toEqual(['a', 'b']);
    expect(sorted.map((n) => n.id)).toEqual(['b', 'a']);
  });
});

describe('summarizeStockNotes', () => {
  it('conta total, fixadas e as do usuário atual', () => {
    const summary = summarizeStockNotes(
      [row({ id: '1', is_pinned: true }), row({ id: '2' }), row({ id: '3', created_by: 'user-2' })],
      'user-1',
    );
    expect(summary).toEqual({ total: 3, pinned: 1, mine: 2 });
  });

  it('sem usuário atual, mine fica zerado', () => {
    expect(summarizeStockNotes([row()]).mine).toBe(0);
  });
});

describe('validateStockNote', () => {
  it('recusa texto vazio ou só espaços', () => {
    const empty = validateStockNote('   ');
    expect(empty.ok).toBe(false);
    expect(empty.message).toBe('Escreva a nota antes de salvar.');
  });

  it('recusa texto menor que o mínimo', () => {
    const short = validateStockNote('a'.repeat(STOCK_NOTE_MIN_LENGTH - 1));
    expect(short.ok).toBe(false);
    expect(short.message).toContain(`${STOCK_NOTE_MIN_LENGTH} caracteres`);
  });

  it('recusa texto acima do limite', () => {
    const long = validateStockNote('a'.repeat(STOCK_NOTE_MAX_LENGTH + 1));
    expect(long.ok).toBe(false);
    expect(long.message).toContain(`${STOCK_NOTE_MAX_LENGTH}`);
  });

  it('aceita e devolve o texto sem espaços nas pontas', () => {
    const ok = validateStockNote('  Aguardando fornecedor  ');
    expect(ok.ok).toBe(true);
    expect(ok.value).toBe('Aguardando fornecedor');
    expect(ok.message).toBeNull();
  });
});

describe('formatStockNoteAge', () => {
  const now = new Date('2026-11-26T12:00:00.000Z');

  it('classifica agora, minutos, horas e dias', () => {
    expect(formatStockNoteAge('2026-11-26T11:59:40.000Z', now)).toBe('agora');
    expect(formatStockNoteAge('2026-11-26T11:30:00.000Z', now)).toBe('há 30 min');
    expect(formatStockNoteAge('2026-11-26T06:00:00.000Z', now)).toBe('há 6 h');
    expect(formatStockNoteAge('2026-11-25T12:00:00.000Z', now)).toBe('há 1 dia');
    expect(formatStockNoteAge('2026-11-22T12:00:00.000Z', now)).toBe('há 4 dias');
  });

  it('usa data absoluta acima de 7 dias', () => {
    expect(formatStockNoteAge('2026-10-01T12:00:00.000Z', now)).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it('devolve vazio para data inválida', () => {
    expect(formatStockNoteAge('', now)).toBe('');
  });
});

describe('describeStockNoteError', () => {
  it('explica bloqueio de RLS', () => {
    expect(
      describeStockNoteError(new Error('new row violates row-level security policy for table')),
    ).toBe('Você só pode alterar as notas que você mesmo criou.');
  });

  it('explica chave estrangeira ausente', () => {
    expect(describeStockNoteError({ message: 'insert violates foreign key constraint' })).toContain(
      'Variação ou fornecedor não encontrado',
    );
  });

  it('explica sessão expirada', () => {
    expect(describeStockNoteError('JWT expired')).toContain('Sessão expirada');
  });

  it('mantém mensagem desconhecida e trata erro sem texto', () => {
    expect(describeStockNoteError(new Error('deadlock detected'))).toBe('deadlock detected');
    expect(describeStockNoteError(undefined)).toBe(
      'Não foi possível concluir a operação. Tente novamente.',
    );
  });
});
