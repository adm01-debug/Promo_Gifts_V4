/**
 * Adaptador SSOT do histórico de mockups — as DUAS telas (MockupHistoryPanel, aba do
 * gerador, e MockupHistoryPage, /mockups/historico) usam este mapeamento, esta lista de
 * colunas e esta exclusão. Sem filtro de dono no cliente: a RLS decide (auth.uid()).
 * O `mockupGenerationService` não é tocado por este cartão.
 */
import { untypedFrom } from '@/lib/supabase-untyped';
import { deleteMockupFromDb, type GeneratedMockup } from '@/hooks/mockup/mockupGenerationService';

/** Itens que a aba do gerador pede ao servidor (atalho para os 10 últimos). */
export const MOCKUP_HISTORY_PANEL_LIMIT = 10;
/** Itens por página na tela completa (paginação no servidor). */
export const MOCKUP_HISTORY_PAGE_SIZE = 20;
/** Mesmas colunas do gerador (o mapper abaixo espelha o shape plano de GeneratedMockup). */
export const MOCKUP_HISTORY_COLUMNS =
  'id, product_id, product_name, product_sku, technique_id, technique_name, ' +
  'mockup_url, layout_url, logo_url, position_x, position_y, ' +
  'logo_width_cm, logo_height_cm, logo_rotation, logo_scale, ' +
  'client_id, client_name, area_name, area_config, created_at';

export interface MockupHistoryPageResult {
  mockups: GeneratedMockup[];
  totalCount: number;
}

type Row = Record<string, unknown>;
const isRecord = (v: unknown): v is Row => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown) => (typeof v === 'string' ? v : null);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const rows = (data: unknown) => (Array.isArray(data) ? data.filter(isRecord) : []);

/**
 * Mapeamento único linha → `GeneratedMockup`. Geometria e cliente leem a coluna top-level
 * (migrations 20251215011449/20260620000001) e caem para `area_config` (JSONB espelhado)
 * em linhas anteriores à migration.
 */
export function mapMockupHistoryRow(row: Row): GeneratedMockup {
  const cfg = isRecord(row.area_config) ? row.area_config : {};
  return {
    id: str(row.id) ?? '',
    product_id: str(row.product_id),
    product_name: str(row.product_name) ?? '',
    product_sku: str(row.product_sku),
    technique_id: str(row.technique_id),
    technique_name: str(row.technique_name) ?? '',
    mockup_url: str(row.mockup_url) ?? '',
    layout_url: str(row.layout_url),
    logo_url: str(row.logo_url) ?? str(cfg.logoUrl),
    position_x: num(row.position_x) ?? num(cfg.positionX),
    position_y: num(row.position_y) ?? num(cfg.positionY),
    logo_width_cm: num(row.logo_width_cm) ?? num(cfg.logoWidth),
    logo_height_cm: num(row.logo_height_cm) ?? num(cfg.logoHeight),
    logo_rotation: num(row.logo_rotation) ?? num(cfg.logoRotation),
    logo_scale: num(row.logo_scale) ?? num(cfg.logoScale),
    client_id: str(row.client_id),
    client_name: str(row.client_name) ?? str(cfg.clientName),
    location_name: str(row.area_name),
    colors_count: num(cfg.colorsCount),
    annotations: Array.isArray(cfg.annotations) ? cfg.annotations.filter(isRecord) : null,
    created_at: str(row.created_at) ?? '',
  } satisfies GeneratedMockup;
}

/** Neutraliza vírgula/parênteses/wildcards antes de interpolar a busca no `or(...)`. */
export function sanitizeMockupSearch(raw: string | undefined): string {
  if (!raw) return '';
  return raw.replace(/[(),*%\\]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Página do histórico completo: paginação no servidor (`range` + `count: 'exact'`). */
export async function fetchMockupHistoryPage(options: {
  page: number;
  pageSize?: number;
  search?: string;
}): Promise<MockupHistoryPageResult> {
  const page = Math.trunc(options.page) > 0 ? Math.trunc(options.page) : 1;
  const pageSize = options.pageSize ?? MOCKUP_HISTORY_PAGE_SIZE;
  let query = untypedFrom('generated_mockups')
    .select(MOCKUP_HISTORY_COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const term = sanitizeMockupSearch(options.search);
  if (term) {
    // BUG-400: client_name não é coluna de generated_mockups (vive em area_config JSONB);
    // usá-lo aqui faz o PostgREST responder HTTP 400.
    query = query.or(
      `product_name.ilike.%${term}%,product_sku.ilike.%${term}%,technique_name.ilike.%${term}%`,
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { mockups: rows(data).map(mapMockupHistoryRow), totalCount: count ?? 0 };
}

/** Atalho do gerador: os N mockups mais recentes, com teto no servidor. */
export async function fetchRecentMockupHistory(
  limit: number = MOCKUP_HISTORY_PANEL_LIMIT,
): Promise<GeneratedMockup[]> {
  const safeLimit = Math.trunc(limit) > 0 ? Math.trunc(limit) : MOCKUP_HISTORY_PANEL_LIMIT;
  const { data, error } = await untypedFrom('generated_mockups')
    .select(MOCKUP_HISTORY_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(safeLimit);
  if (error) throw error;
  return rows(data).map(mapMockupHistoryRow);
}

/** Exclusão única das duas telas: delega para `deleteMockupFromDb` (linha + storage). */
export async function deleteMockupHistoryItem(id: string): Promise<void> {
  await deleteMockupFromDb(id);
}
