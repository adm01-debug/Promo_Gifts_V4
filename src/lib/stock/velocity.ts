/**
 * Regras puras do "giro por variante" — velocidade de saída.
 *
 * Fonte: `public.v_stock_velocity_safe` (SECURITY INVOKER, SELECT para
 * `authenticated`), view sobre `analytics.mv_stock_velocity` com winsorização
 * p99 dinâmica de `avg_daily_depletion_*`. O motivo declarado no próprio
 * catálogo é que um pedido de 34k un/dia distorcia o giro do item: o valor
 * bruto segue em `raw_avg_depletion_*` e `was_capped` diz quando o p99 cortou.
 *
 * Nada aqui toca o banco — funções puras, testáveis e reaproveitáveis.
 */

export interface StockVelocityRow {
  variant_id: string | null;
  product_id: string | null;
  avg_daily_depletion_7d: number | null;
  avg_daily_depletion_30d: number | null;
  avg_daily_depletion_90d: number | null;
  raw_avg_depletion_30d: number | null;
  p99_cap_30d: number | null;
  was_capped: boolean | null;
  total_depleted_7d: number | null;
  total_depleted_30d: number | null;
  total_depleted_90d: number | null;
  active_days_30d: number | null;
}

export type VelocityBand = 'alta' | 'baixa' | 'media' | 'parada';

export const VELOCITY_BAND_LABELS: Record<VelocityBand, string> = {
  alta: 'Alta rotação',
  media: 'Média rotação',
  baixa: 'Baixa rotação',
  parada: 'Sem saída',
};

/** Limites em unidades/dia (média de 30 dias já winsorizada). */
export const HIGH_ROTATION_MIN = 5;
export const MEDIUM_ROTATION_MIN = 1;

export function classifyVelocity(avgDaily30d: number | null | undefined): VelocityBand {
  const value = Number(avgDaily30d ?? 0);
  if (!Number.isFinite(value) || value <= 0) return 'parada';
  if (value >= HIGH_ROTATION_MIN) return 'alta';
  if (value >= MEDIUM_ROTATION_MIN) return 'media';
  return 'baixa';
}

/** Dias de estoque restante no ritmo atual. `null` quando não há ritmo (ou estoque) para extrapolar. */
export function daysOfCoverage(
  currentStock: number | null | undefined,
  avgDaily30d: number | null | undefined,
): number | null {
  if (currentStock === null || currentStock === undefined || !Number.isFinite(currentStock)) {
    return null;
  }
  const rate = Number(avgDaily30d ?? 0);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return Math.round(currentStock / rate);
}

export interface VelocityIdentity {
  productName: string;
  variantLabel: string;
  currentStock: number | null;
}

export interface VelocityView {
  variantId: string;
  productId: string | null;
  productName: string;
  variantLabel: string;
  currentStock: number | null;
  avg7d: number;
  avg30d: number;
  avg90d: number;
  rawAvg30d: number;
  totalDepleted30d: number;
  activeDays30d: number;
  coverageDays: number | null;
  wasCapped: boolean;
  band: VelocityBand;
}

const num = (value: number | null | undefined): number =>
  Number.isFinite(Number(value)) ? Number(value) : 0;

/**
 * Mapa `variantId -> identidade` montado a partir do cache de estoque
 * (`variant-stock-data`), que é a única fonte de nome de produto/variante que
 * a view de velocidade não carrega.
 */
export function buildVelocityIdentityMap(
  productStocks: ReadonlyArray<{
    productId: string;
    productName: string;
    variants: ReadonlyArray<{
      variantId: string;
      variantSku?: string;
      colorName?: string;
      sizeName?: string;
      currentStock?: number;
    }>;
  }>,
): Map<string, VelocityIdentity> {
  const map = new Map<string, VelocityIdentity>();
  for (const product of productStocks) {
    for (const variant of product.variants ?? []) {
      if (!variant?.variantId) continue;
      const parts = [variant.colorName, variant.sizeName].filter((part): part is string =>
        Boolean(part?.trim()),
      );
      map.set(variant.variantId, {
        productName: product.productName,
        variantLabel:
          parts.length > 0 ? parts.join(' · ') : (variant.variantSku ?? variant.variantId),
        currentStock: variant.currentStock ?? null,
      });
    }
  }
  return map;
}

export function buildVelocityViews(
  rows: readonly StockVelocityRow[],
  identities: ReadonlyMap<string, VelocityIdentity>,
): VelocityView[] {
  const views: VelocityView[] = [];
  for (const row of rows) {
    const variantId = row.variant_id;
    if (!variantId) continue;
    const identity = identities.get(variantId);
    const avg30d = num(row.avg_daily_depletion_30d);
    views.push({
      variantId,
      productId: row.product_id ?? null,
      productName: identity?.productName ?? row.product_id ?? 'Produto sem nome no cache',
      variantLabel: identity?.variantLabel ?? variantId,
      currentStock: identity?.currentStock ?? null,
      avg7d: num(row.avg_daily_depletion_7d),
      avg30d,
      avg90d: num(row.avg_daily_depletion_90d),
      rawAvg30d: num(row.raw_avg_depletion_30d),
      totalDepleted30d: num(row.total_depleted_30d),
      activeDays30d: num(row.active_days_30d),
      coverageDays: daysOfCoverage(identity?.currentStock ?? null, avg30d),
      wasCapped: row.was_capped === true,
      band: classifyVelocity(avg30d),
    });
  }
  return views;
}

export interface VelocityFilter {
  search?: string;
  bands?: readonly VelocityBand[];
}

export function filterVelocityViews(
  views: readonly VelocityView[],
  filter: VelocityFilter = {},
): VelocityView[] {
  const term = (filter.search ?? '').trim().toLowerCase();
  const bands = filter.bands ?? [];
  return views.filter((view) => {
    if (bands.length > 0 && !bands.includes(view.band)) return false;
    if (!term) return true;
    return (
      view.productName.toLowerCase().includes(term) ||
      view.variantLabel.toLowerCase().includes(term) ||
      view.variantId.toLowerCase().includes(term)
    );
  });
}

/** Ordena por giro de 30 dias (desc); empate resolvido por nome do produto. */
export function sortVelocityViews(views: readonly VelocityView[]): VelocityView[] {
  return [...views].sort((a, b) => {
    if (b.avg30d !== a.avg30d) return b.avg30d - a.avg30d;
    return a.productName.localeCompare(b.productName, 'pt-BR');
  });
}

export interface VelocitySummary {
  total: number;
  bandCounts: Record<VelocityBand, number>;
  capped: number;
  withCoverage: number;
  criticalCoverage: number;
}

/** `criticalCoverage` = variantes com menos de 15 dias de cobertura no ritmo atual. */
export const CRITICAL_COVERAGE_DAYS = 15;

export function summarizeVelocity(views: readonly VelocityView[]): VelocitySummary {
  const bandCounts: Record<VelocityBand, number> = { alta: 0, media: 0, baixa: 0, parada: 0 };
  let capped = 0;
  let withCoverage = 0;
  let criticalCoverage = 0;
  for (const view of views) {
    bandCounts[view.band] += 1;
    if (view.wasCapped) capped += 1;
    if (view.coverageDays !== null && view.coverageDays !== undefined) {
      withCoverage += 1;
      if (view.coverageDays < CRITICAL_COVERAGE_DAYS) criticalCoverage += 1;
    }
  }
  return { total: views.length, bandCounts, capped, withCoverage, criticalCoverage };
}
