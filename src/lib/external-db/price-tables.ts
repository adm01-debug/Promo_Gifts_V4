import { dbInvoke } from '@/lib/db/postgrest';
import { logger } from '@/lib/logger';
/**
 * Price tables for Promobrind customization.
 */

export interface PromobrindPriceTable {
  id: string;
  table_code: string;
  table_code_option: string;
  customization_type_name: string;
  technique_code: string | null;
  min_quantity: number;
  max_quantity: number | null;
  min_colors: number | null;
  max_colors: number | null;
  max_area_width_cm: number | null;
  max_area_height_cm: number | null;
  unit_price: number;
  setup_price: number | null;
  handling_price: number | null;
  sla_days: number | null;
  is_active: boolean;
  code_option?: string;
  technique_name?: string;
}

// `grupo_tecnica` (alias customization_type_name) usa códigos próprios; a UI envia o
// nome da técnica de personalization_techniques ("Silk Screen", "Sublimação"...).
const TECHNIQUE_GROUP_RULES: Array<[RegExp, string]> = [
  [/BORD/, 'BORDADO'],
  [/SILK|SERIGRAF/, 'SERIGRAFIA'],
  [/SUBLIM/, 'SUBLIMACAO'],
  [/TAMPO/, 'TAMPOGRAFIA'],
  [/LASER\s*CO2/, 'LASER_CO2'],
  [/LASER/, 'LASER'],
  [/TRANSFER|DTF/, 'TRANSFER_DIGITAL'],
  [/(^|[^A-Z])UV([^A-Z]|$)/, 'UV_DIGITAL'],
];

export function toTechniqueGroup(techniqueName: string): string {
  const normalized = techniqueName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
  const rule = TECHNIQUE_GROUP_RULES.find(([re]) => re.test(normalized));
  return rule ? rule[1] : normalized.replace(/\s+/g, '_');
}

export async function fetchPromobrindPriceTables(options?: {
  techniqueName?: string;
  techniqueCode?: string;
  quantity?: number;
  colors?: number;
  width?: number;
  height?: number;
}): Promise<PromobrindPriceTable[]> {
  const filters: Record<string, unknown> = { is_active: true };
  if (options?.techniqueName)
    filters.customization_type_name = toTechniqueGroup(options.techniqueName);
  if (options?.techniqueCode) filters.table_code = options.techniqueCode;

  let result: { records: Record<string, unknown>[] };
  try {
    result = await dbInvoke<Record<string, unknown>>({
      table: 'customization_price_tables',
      operation: 'select',
      filters,
      select: '*',
      limit: 500,
      orderBy: { column: 'ordem_exibicao', ascending: true },
    });
  } catch (err) {
    if (err instanceof Error && (err.message.includes('410') || err.message.includes('Gone'))) {
      logger.warn('[price-tables] Bridge deprecated (410) for customization_price_tables');
      return [];
    }
    throw err;
  }

  const ids = result.records.map((r) => r.id as string).filter(Boolean);
  const tiersByTable = new Map<string, Record<string, unknown>[]>();
  for (let i = 0; i < ids.length; i += 50) {
    for (let offset = 0; ; offset += 1000) {
      const tiers = await dbInvoke<Record<string, unknown>>({
        table: 'tabela_preco_gravacao_oficial_faixa',
        operation: 'select',
        filters: { tabela_preco_gravacao_id: ids.slice(i, i + 50) },
        select:
          'tabela_preco_gravacao_id, quantidade_minima, quantidade_maxima, preco_unitario, prazo_dias, largura_min, largura_max, altura_min, altura_max',
        limit: 1000,
        offset,
        orderBy: { column: 'quantidade_minima', ascending: true },
        secondaryOrderBy: { column: 'id', ascending: true },
      });
      for (const t of tiers.records) {
        const key = t.tabela_preco_gravacao_id as string;
        const list = tiersByTable.get(key) ?? [];
        list.push(t);
        tiersByTable.set(key, list);
      }
      if (tiers.records.length < 1000) break;
    }
  }

  const { quantity, colors, width, height } = options ?? {};
  const isSet = (v: unknown) => v !== null && v !== undefined;
  const inRange = (v: number, min: unknown, max: unknown) =>
    (!isSet(min) || v >= Number(min)) && (!isSet(max) || v <= Number(max));

  let tables: PromobrindPriceTable[] = result.records.flatMap((r) => {
    const base: PromobrindPriceTable = {
      id: r.id as string,
      table_code: r.table_code as string,
      table_code_option: r.table_code_option as string,
      customization_type_name: r.customization_type_name as string,
      technique_code: (r.serv_code || r.table_code) as string | null,
      min_quantity: 1,
      max_quantity: null,
      min_colors: null,
      max_colors: (r.max_colors as number) || null,
      max_area_width_cm: (r.max_area_width_cm as number) || null,
      max_area_height_cm: (r.max_area_height_cm as number) || null,
      unit_price: 0,
      setup_price: (r.setup_price as number) || null,
      handling_price: (r.handling_price as number) || null,
      sla_days: null,
      is_active: r.is_active as boolean,
      code_option: r.table_code_option as string,
      technique_name: r.customization_type_name as string,
    };
    const allTiers = tiersByTable.get(base.id) ?? [];
    const isDimensional = allTiers.some(
      (t) =>
        isSet(t.largura_min) || isSet(t.largura_max) || isSet(t.altura_min) || isSet(t.altura_max),
    );
    const tiers = !isDimensional
      ? allTiers
      : width && height
        ? allTiers.filter(
            (t) =>
              inRange(width, t.largura_min, t.largura_max) &&
              inRange(height, t.altura_min, t.altura_max),
          )
        : [];
    if (!tiers.length) return [base];
    return tiers.map((t) => ({
      ...base,
      min_quantity: Number(t.quantidade_minima) || 1,
      max_quantity:
        t.quantidade_maxima !== null && t.quantidade_maxima !== undefined
          ? Number(t.quantidade_maxima)
          : null,
      unit_price: Number(t.preco_unitario) || 0,
      sla_days: t.prazo_dias !== null && t.prazo_dias !== undefined ? Number(t.prazo_dias) : null,
    }));
  });

  if (quantity)
    tables = tables.filter(
      (t) => t.min_quantity <= quantity && (t.max_quantity === null || t.max_quantity >= quantity),
    );
  if (colors)
    tables = tables.filter(
      (t) =>
        (t.min_colors === null || t.min_colors <= colors) &&
        (t.max_colors === null || t.max_colors >= colors),
    );
  if (width)
    tables = tables.filter((t) => t.max_area_width_cm === null || t.max_area_width_cm >= width);
  if (height)
    tables = tables.filter((t) => t.max_area_height_cm === null || t.max_area_height_cm >= height);

  return tables;
}

export async function findBestPriceTable(options: {
  techniqueName?: string;
  techniqueCode?: string;
  quantity: number;
  colors?: number;
  width?: number;
  height?: number;
}): Promise<PromobrindPriceTable | null> {
  const tables = await fetchPromobrindPriceTables(options);
  return tables[0] || null;
}
