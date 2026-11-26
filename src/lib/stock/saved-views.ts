/**
 * Regras puras de `public.saved_stock_views` (views salvas do painel /estoque).
 *
 * Sem dependencia de React ou Supabase: contrato da tabela, parse defensivo do que vem do
 * PostgREST (jsonb chega como objeto solto) e traducao de erro para o operador.
 * A tabela nasceu na migration 20261126130000, que fecha o hook orfao useSavedStockViews.
 */

export interface StockViewFilters {
  activeLevel: string | null;
}

export interface SavedStockViewRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  filters: StockViewFilters;
  is_pinned: boolean;
  use_count: number;
  created_at: string;
  updated_at: string;
}

export const STOCK_VIEW_NAME_MIN_LENGTH = 3;
export const STOCK_VIEW_NAME_MAX_LENGTH = 80;
export const STOCK_VIEW_DESCRIPTION_MAX_LENGTH = 200;

export type ViewNameValidation = { ok: false; error: string } | { ok: true; value: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** Colapsa espacos repetidos e apara as pontas: o nome e a chave unica por usuario. */
export function normalizeViewName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

export function normalizeFilters(value: unknown): StockViewFilters {
  if (!isRecord(value)) return { activeLevel: null };
  return { activeLevel: nonEmptyString(value.activeLevel) };
}

export function serializeFilters(filters: StockViewFilters): Record<string, unknown> {
  return { activeLevel: filters.activeLevel };
}

export function describeFilters(filters: StockViewFilters): string {
  return filters.activeLevel ? `nível ${filters.activeLevel}` : 'todos os níveis';
}

export function parseSavedStockView(raw: unknown): SavedStockViewRow | null {
  if (!isRecord(raw)) return null;
  const id = nonEmptyString(raw.id);
  const userId = nonEmptyString(raw.user_id);
  const name = nonEmptyString(raw.name);
  const createdAt = nonEmptyString(raw.created_at);
  if (!id || !userId || !name || !createdAt) return null;

  const useCount =
    typeof raw.use_count === 'number' && Number.isFinite(raw.use_count) && raw.use_count > 0
      ? Math.floor(raw.use_count)
      : 0;

  return {
    id,
    user_id: userId,
    name: normalizeViewName(name),
    description: nonEmptyString(raw.description),
    filters: normalizeFilters(raw.filters),
    is_pinned: raw.is_pinned === true,
    use_count: useCount,
    created_at: createdAt,
    updated_at: nonEmptyString(raw.updated_at) ?? createdAt,
  };
}

/** Fixadas primeiro (o operador escolheu), depois ordem alfabetica em pt-BR. */
export function sortSavedStockViews(views: readonly SavedStockViewRow[]): SavedStockViewRow[] {
  return [...views].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
  });
}

export function parseSavedStockViews(raw: unknown): SavedStockViewRow[] {
  if (!Array.isArray(raw)) return [];
  const rows: SavedStockViewRow[] = [];
  for (const item of raw) {
    const parsed = parseSavedStockView(item);
    if (parsed) rows.push(parsed);
  }
  return sortSavedStockViews(rows);
}

export function validateSavedStockViewName(
  raw: string,
  existing: readonly SavedStockViewRow[],
): ViewNameValidation {
  const value = normalizeViewName(raw);
  if (value === '') return { ok: false, error: 'Informe um nome para a view.' };
  if (value.length < STOCK_VIEW_NAME_MIN_LENGTH) {
    return { ok: false, error: `O nome precisa ter pelo menos ${STOCK_VIEW_NAME_MIN_LENGTH} caracteres.` };
  }
  if (value.length > STOCK_VIEW_NAME_MAX_LENGTH) {
    return { ok: false, error: `O nome pode ter no máximo ${STOCK_VIEW_NAME_MAX_LENGTH} caracteres.` };
  }
  const duplicate = existing.some(
    (view) => view.name.localeCompare(value, 'pt-BR', { sensitivity: 'base' }) === 0,
  );
  if (duplicate) return { ok: false, error: 'Já existe uma view com esse nome.' };
  return { ok: true, value };
}

export function formatViewUsage(useCount: number): string {
  const count = Number.isFinite(useCount) ? Math.floor(useCount) : 0;
  if (count <= 0) return 'nunca aplicada';
  return count === 1 ? 'aplicada 1 vez' : `aplicada ${count} vezes`;
}

export function describeSavedStockViewError(error: unknown): string {
  const direct = nonEmptyString(error);
  if (direct) return direct;

  const code = isRecord(error) ? nonEmptyString(error.code) ?? '' : '';
  const message = isRecord(error) ? nonEmptyString(error.message) ?? '' : '';

  if (code === '23505') return 'Já existe uma view com esse nome.';
  if (code === '42501') return 'Sem permissão para alterar views salvas.';
  if (code === '23503') return 'Sessão inválida: usuário não encontrado.';
  if (/relation .* does not exist/i.test(message)) {
    return 'Views salvas ainda não existem no banco (migration 20261126130000 pendente).';
  }
  if (/JWT|not authenticated|invalid claim/i.test(message)) {
    return 'Sessão expirada. Entre novamente para usar views salvas.';
  }
  if (message !== '') return message;
  return 'Não foi possível concluir a operação com views salvas.';
}
