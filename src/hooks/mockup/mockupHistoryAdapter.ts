/**
 * Adaptador do histórico de mockups para a aba do gerador.
 *
 * A aba do histórico dentro do gerador é um atalho: só precisa dos últimos
 * mockups. `fetchMockupHistory` (mockupGenerationService) pede 200 linhas ao
 * servidor e serve outros fluxos, então o teto de 10 vive aqui, na porta de
 * entrada da aba, sem mexer no serviço.
 *
 * As colunas e o mapeamento linha → `GeneratedMockup` são privados do serviço
 * (não exportados), por isso estão repetidos abaixo. Mudança no shape de
 * `generated_mockups` tem de passar pelos dois lugares.
 *
 * SSOT: `user_id` continua no filtro quando há usuário — a RLS é a última
 * palavra, mas o filtro explícito que o main já aplicava não é removido aqui.
 */
import { untypedFrom } from '@/lib/supabase-untyped';
import type { GeneratedMockup } from '@/hooks/mockup/mockupGenerationService';

/** Itens que a aba do gerador pede ao servidor (atalho para os últimos mockups). */
export const MOCKUP_HISTORY_PANEL_LIMIT = 10;

/** Mesmas colunas de `MOCKUP_HISTORY_COLUMNS` em mockupGenerationService.ts. */
const MOCKUP_HISTORY_COLUMNS =
  'id, product_id, product_name, product_sku, technique_id, technique_name, ' +
  'mockup_url, layout_url, logo_url, position_x, position_y, ' +
  'logo_width_cm, logo_height_cm, logo_rotation, logo_scale, ' +
  'client_id, client_name, area_name, area_config, created_at';

type Row = Record<string, unknown>;
const isRecord = (v: unknown): v is Row => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown) => (typeof v === 'string' ? v : null);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
/** Linhas do PostgREST chegam sem tipo útil (untypedFrom): filtra o que não é objeto. */
const rowsOf = (data: unknown): Row[] => (Array.isArray(data) ? data.filter(isRecord) : []);

/**
 * Mapeamento linha → `GeneratedMockup`. Geometria e cliente leem a coluna
 * top-level (migrations 20251215011449/20260620000001) e caem para
 * `area_config` (JSONB espelhado) em linhas anteriores à migration.
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

/**
 * Atalho do gerador: os N mockups mais recentes, com o teto aplicado no
 * servidor (`.limit`) em vez de trazer a lista inteira e cortar no cliente.
 */
export async function fetchRecentMockupHistory(
  userId?: string,
  limit: number = MOCKUP_HISTORY_PANEL_LIMIT,
): Promise<GeneratedMockup[]> {
  const safeLimit = Math.trunc(limit) > 0 ? Math.trunc(limit) : MOCKUP_HISTORY_PANEL_LIMIT;
  let query = untypedFrom('generated_mockups')
    .select(MOCKUP_HISTORY_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(safeLimit);
  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query;
  if (error) throw error;
  return rowsOf(data).map(mapMockupHistoryRow);
}
