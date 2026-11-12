// Historical pure contracts recovered from 10d607a47^ (before decommission #557).
// Used by preserved unit tests only; index.ts still returns 410 and imports none of this code.

const PRODUCTS_LIGHTWEIGHT_SELECT = 'id,name,sku,sale_price,cost_price,primary_image_url,category_id,main_category_id,supplier_id,supplier_reference,description,short_description,brand,is_active,active,stock_quantity,min_quantity,created_at,updated_at,is_featured,is_bestseller,is_new,is_on_sale,is_kit';

export const LIGHTWEIGHT_LIMIT_THRESHOLD = 50;

function readColumnThresholdFromEnv(): number {
  try {
    // deno-lint-ignore no-explicit-any
    const denoGlobal = (globalThis as { Deno?: { env?: { get?: (name: string) => string | undefined } } }).Deno;
    const raw = denoGlobal?.env?.get?.('LIGHTWEIGHT_COLUMN_THRESHOLD');
    if (!raw) return 25;
    const parsed = Number.parseInt(String(raw), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return 25;
    return parsed;
  } catch {
    return 25;
  }
}

export const WIDE_SELECT_COLUMN_THRESHOLD = readColumnThresholdFromEnv();

export const HEAVY_PRODUCT_COLUMNS = new Set<string>([
  // JSONB / objects
  'metadata',
  'specifications',
  'attributes_json',
  'attributes',
  'personalization_areas',
  'schema_json',
  'dimensions',
  'seo_issues',
  // HTML / texto longo
  'description_html',
  'description_packaging_info',
  'meta_description',
  'meta_keywords',
  'ai_description',
  'ai_summary',
  // Arrays / JSON arrays grandes
  'images',
  'videos',
  'tags',
  'key_benefits',
  'capacities',
  'combined_sizes',
  'use_cases',
  'target_audience',
  'colors',
  'materials',
]);

export function extractBaseColumn(token: string): string {
  const trimmed = token.trim();
  if (!trimmed) return '';
  // Embed PostgREST (joins): "fk_table(...)" — não é uma coluna direta da base.
  if (trimmed.includes('(')) return '';
  // Remove alias PostgREST "alias:column"
  const afterAlias = trimmed.includes(':') ? trimmed.slice(trimmed.indexOf(':') + 1) : trimmed;
  // Remove operadores JSON "->" e "->>"
  const beforeArrow = afterAlias.split('->')[0];
  return beforeArrow.trim();
}

export function callerSelectIsHeavy(select: string): boolean {
  for (const rawToken of select.split(',')) {
    const col = extractBaseColumn(rawToken);
    if (col && HEAVY_PRODUCT_COLUMNS.has(col)) return true;
  }
  return false;
}

export interface ResolveProductsSelectInput {
  table: string;
  select: string | undefined | null;
  limit: number | undefined | null;
  hasId: boolean;
}

export interface ResolveProductsSelectResult {
  effectiveSelect: string;
  forcedLightweight: boolean;
  reason:
    | 'not-products'
    | 'has-id'
    | 'small-limit'
    | 'star-select-listing'
    | 'wide-select-listing'
    | 'heavy-jsonb-listing'
    | 'caller-select';
}

export function resolveProductsSelect(input: ResolveProductsSelectInput): ResolveProductsSelectResult {
  const { table, select, limit, hasId } = input;
  const callerSelect = select && select.length > 0 ? select : '*';

  if (table !== 'products') {
    return { effectiveSelect: callerSelect, forcedLightweight: false, reason: 'not-products' };
  }
  if (hasId) {
    return { effectiveSelect: callerSelect, forcedLightweight: false, reason: 'has-id' };
  }

  const safeLimit = typeof limit === 'number' && limit > 0 ? limit : 0;
  // HARD GUARD against regression: never force lightweight on small reads.
  if (safeLimit <= LIGHTWEIGHT_LIMIT_THRESHOLD) {
    return { effectiveSelect: callerSelect, forcedLightweight: false, reason: 'small-limit' };
  }

  const isStarOrEmpty = !select || select === '*';
  if (isStarOrEmpty) {
    return { effectiveSelect: PRODUCTS_LIGHTWEIGHT_SELECT, forcedLightweight: true, reason: 'star-select-listing' };
  }
  if (select.split(',').length > WIDE_SELECT_COLUMN_THRESHOLD) {
    return { effectiveSelect: PRODUCTS_LIGHTWEIGHT_SELECT, forcedLightweight: true, reason: 'wide-select-listing' };
  }
  if (callerSelectIsHeavy(select)) {
    return { effectiveSelect: PRODUCTS_LIGHTWEIGHT_SELECT, forcedLightweight: true, reason: 'heavy-jsonb-listing' };
  }

  return { effectiveSelect: callerSelect, forcedLightweight: false, reason: 'caller-select' };
}

export interface SelectDecisionLogContext {
  callSite: 'handleSelect' | 'handleBatch';
  table: string;
  callerSelect: string | undefined | null;
  effectiveLimit: number;
  hasId: boolean;
  resolved: ResolveProductsSelectResult;
}

const LIGHTWEIGHT_REASONS = new Set<ResolveProductsSelectResult['reason']>([
  'star-select-listing',
  'wide-select-listing',
  'heavy-jsonb-listing',
]);

export function logSelectDecision(ctx: SelectDecisionLogContext): void {
  const { callSite, table, callerSelect, effectiveLimit, hasId, resolved } = ctx;
  const callerLen = (callerSelect ?? '').split(',').filter(Boolean).length;
  const effectiveLen = resolved.effectiveSelect.split(',').filter(Boolean).length;

  const payload = {
    event: 'select-decision',
    callSite,
    table,
    forcedLightweight: resolved.forcedLightweight,
    mode: resolved.forcedLightweight ? 'lightweight-forced' : 'caller-default',
    reason: resolved.reason,
    effectiveLimit,
    hasId,
    limitThreshold: LIGHTWEIGHT_LIMIT_THRESHOLD,
    columnThreshold: WIDE_SELECT_COLUMN_THRESHOLD,
    // mantido para compat com dashboards já existentes
    threshold: LIGHTWEIGHT_LIMIT_THRESHOLD,
    callerSelect: callerSelect && callerSelect.length > 120
      ? `${callerSelect.slice(0, 117)}...`
      : (callerSelect ?? '(omitted)'),
    callerColumnCount: callerLen,
    effectiveColumnCount: effectiveLen,
    exceededColumnThreshold: callerLen > WIDE_SELECT_COLUMN_THRESHOLD,
  };

  if (resolved.forcedLightweight) {
    console.log(
      `[external-db-bridge] ⚡ select-decision table=${table} mode=lightweight-forced reason=${resolved.reason} ` +
      `limit=${effectiveLimit} (>${LIGHTWEIGHT_LIMIT_THRESHOLD}) caller_cols=${callerLen} ` +
      `(col_threshold=${WIDE_SELECT_COLUMN_THRESHOLD}) effective_cols=${effectiveLen} ` +
      `callSite=${callSite} → ${JSON.stringify(payload)}`,
    );
    return;
  }

  // Para não poluir os logs de queries triviais, só registramos o "default"
  // em situações onde a decisão é informativa: tabela `products` com qualquer limit,
  // ou outras tabelas quando o limit ultrapassa o threshold (poderia ter sido afetado).
  const isInformative =
    table === 'products' ||
    LIGHTWEIGHT_REASONS.has(resolved.reason) || // defesa: nunca cai aqui, mas explícito
    effectiveLimit > LIGHTWEIGHT_LIMIT_THRESHOLD;

  if (isInformative) {
    console.log(
      `[external-db-bridge] · select-decision table=${table} mode=caller-default reason=${resolved.reason} ` +
      `limit=${effectiveLimit} hasId=${hasId} caller_cols=${callerLen} ` +
      `(col_threshold=${WIDE_SELECT_COLUMN_THRESHOLD}) callSite=${callSite} → ${JSON.stringify(payload)}`,
    );
  }
}
