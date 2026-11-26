/**
 * Regras puras de `public.stock_notes` — notas operacionais por variação.
 *
 * A tabela existe desde a migration 20261031000000 (RLS: leitura para
 * `authenticated`, escrita apenas do próprio autor via policies *_own), mas o
 * hook `useStockNotes` nasceu órfão: nenhuma tela criava, fixava, editava ou
 * excluía uma nota. Este módulo concentra o que dá para testar sem React —
 * parsing do payload do PostgREST, ordenação, resumo, validação do texto e
 * tradução dos erros do banco para linguagem de operação.
 */

export interface StockNoteRow {
  id: string;
  variant_id: string;
  supplier_id: string | null;
  created_by: string;
  note: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockNoteSummary {
  total: number;
  pinned: number;
  mine: number;
}

export interface StockNoteValidation {
  ok: boolean;
  /** Texto já normalizado (trim). Só é confiável quando `ok` é true. */
  value: string;
  /** Mensagem para o operador. `null` quando `ok` é true. */
  message: string | null;
}

export const STOCK_NOTE_MIN_LENGTH = 3;
export const STOCK_NOTE_MAX_LENGTH = 2000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toIdentifier(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function toIsoOrEmpty(value: unknown): string {
  if (typeof value !== 'string') return '';
  return Number.isNaN(Date.parse(value)) ? '' : value;
}

function toMillis(iso: string): number {
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** Converte uma linha crua do PostgREST em `StockNoteRow`. `null` = linha inválida. */
export function parseStockNote(raw: unknown): StockNoteRow | null {
  if (!isRecord(raw)) return null;
  const id = toIdentifier(raw.id);
  const variantId = toIdentifier(raw.variant_id);
  const createdBy = toIdentifier(raw.created_by);
  const note = typeof raw.note === 'string' ? raw.note : null;
  if (!id || !variantId || !createdBy || note === null) return null;
  return {
    id,
    variant_id: variantId,
    supplier_id: toIdentifier(raw.supplier_id),
    created_by: createdBy,
    note,
    is_pinned: raw.is_pinned === true,
    created_at: toIsoOrEmpty(raw.created_at),
    updated_at: toIsoOrEmpty(raw.updated_at),
  };
}

/** Converte o payload completo, descartando linhas que não têm o mínimo exigido. */
export function parseStockNotes(raw: unknown): StockNoteRow[] {
  if (!Array.isArray(raw)) return [];
  const parsed: StockNoteRow[] = [];
  for (const item of raw) {
    const note = parseStockNote(item);
    if (note) parsed.push(note);
  }
  return parsed;
}

/** Fixadas primeiro; dentro de cada grupo, a mais recente primeiro. */
export function sortStockNotes(notes: StockNoteRow[]): StockNoteRow[] {
  return [...notes].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    return toMillis(b.created_at) - toMillis(a.created_at);
  });
}

export function summarizeStockNotes(
  notes: StockNoteRow[],
  currentUserId?: string | null,
): StockNoteSummary {
  let pinned = 0;
  let mine = 0;
  for (const note of notes) {
    if (note.is_pinned) pinned += 1;
    if (currentUserId && note.created_by === currentUserId) mine += 1;
  }
  return { total: notes.length, pinned, mine };
}

export function validateStockNote(note: string): StockNoteValidation {
  const value = note.trim();
  if (value.length === 0) {
    return { ok: false, value, message: 'Escreva a nota antes de salvar.' };
  }
  if (value.length < STOCK_NOTE_MIN_LENGTH) {
    return {
      ok: false,
      value,
      message: `A nota precisa de pelo menos ${STOCK_NOTE_MIN_LENGTH} caracteres.`,
    };
  }
  if (value.length > STOCK_NOTE_MAX_LENGTH) {
    return {
      ok: false,
      value,
      message: `A nota passa do limite de ${STOCK_NOTE_MAX_LENGTH} caracteres.`,
    };
  }
  return { ok: true, value, message: null };
}

/** Idade relativa curta ("há 5 min"); acima de 7 dias cai para a data. */
export function formatStockNoteAge(iso: string, now: Date = new Date()): string {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return '';
  const diffMs = now.getTime() - parsed;
  if (diffMs < 60_000) return 'agora';
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return days === 1 ? 'há 1 dia' : `há ${days} dias`;
  return new Date(parsed).toLocaleDateString('pt-BR');
}

/**
 * Erros do PostgREST/Postgres traduzidos para o que o operador precisa saber.
 * RLS é o caso mais provável: as policies de escrita são `*_own`.
 */
export function describeStockNoteError(error: unknown): string {
  const raw =
    typeof error === 'string'
      ? error
      : isRecord(error) && typeof error.message === 'string'
        ? error.message
        : '';
  const lower = raw.toLowerCase();
  if (lower.includes('row-level security') || lower.includes('violates row-level')) {
    return 'Você só pode alterar as notas que você mesmo criou.';
  }
  if (lower.includes('foreign key') || lower.includes('violates foreign key')) {
    return 'Variação ou fornecedor não encontrado. Atualize a página e tente novamente.';
  }
  if (lower.includes('jwt') || lower.includes('not authenticated') || lower.includes('token')) {
    return 'Sessão expirada. Entre novamente para continuar.';
  }
  if (lower.includes('fetch') || lower.includes('network') || lower.includes('failed to load')) {
    return 'Falha de conexão. Verifique a rede e tente novamente.';
  }
  return raw.length > 0 ? raw : 'Não foi possível concluir a operação. Tente novamente.';
}
