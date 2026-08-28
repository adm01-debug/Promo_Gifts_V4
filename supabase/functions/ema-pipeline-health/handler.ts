export type EmaHealthStatus = "OK" | "WARN" | "ERROR" | "UNKNOWN";

export interface RuptureHealthCheckRow {
  check_name: string;
  status: string;
  value_atual: string | null;
  threshold: string | null;
  severidade: string | null;
}

export interface RuptureQuickStatsRow {
  refreshed_at: string | null;
}

export interface EmaHealthComponentV1 {
  id: string;
  status: EmaHealthStatus;
  last_refreshed_at: string | null;
  next_scheduled_at: null;
  detail: string;
  source: "rupture_health_check";
}

export interface EmaHealthResponseV1 {
  version: 1;
  checked_at: string;
  freshness: {
    last_refreshed_at: string | null;
    status: EmaHealthStatus;
    semantics: "read_model_refresh";
  };
  components: EmaHealthComponentV1[];
}

export function normalizeEmaHealthStatus(
  status: string | null | undefined,
): EmaHealthStatus {
  const normalized = status?.trim().toUpperCase();
  if (normalized === "OK") return "OK";
  if (
    normalized === "WARN" || normalized === "ATENÇÃO" || normalized === "ATRASO"
  ) {
    return "WARN";
  }
  if (
    normalized === "ERRO" || normalized === "ERROR" ||
    normalized === "CRÍTICO" || normalized === "FALHA"
  ) {
    return "ERROR";
  }
  return "UNKNOWN";
}

function latestIsoTimestamp(rows: RuptureQuickStatsRow[]): string | null {
  const valid = rows
    .map((row) => row.refreshed_at)
    .filter((value): value is string =>
      typeof value === "string" && !Number.isNaN(Date.parse(value))
    )
    .sort((a, b) => Date.parse(b) - Date.parse(a));
  return valid[0] ?? null;
}

function worstStatus(statuses: EmaHealthStatus[]): EmaHealthStatus {
  const rank: Record<EmaHealthStatus, number> = {
    UNKNOWN: 0,
    OK: 1,
    WARN: 2,
    ERROR: 3,
  };
  return statuses.reduce<EmaHealthStatus>(
    (worst, status) => (rank[status] > rank[worst] ? status : worst),
    "UNKNOWN",
  );
}

export function buildEmaHealthResponse(
  checks: RuptureHealthCheckRow[],
  quickStats: RuptureQuickStatsRow[],
  checkedAt = new Date().toISOString(),
): EmaHealthResponseV1 {
  const lastRefreshedAt = latestIsoTimestamp(quickStats);
  const components = checks.map<EmaHealthComponentV1>((check) => ({
    id: check.check_name,
    status: normalizeEmaHealthStatus(check.status),
    last_refreshed_at: check.check_name === "C06_VELOCITY_FRESCA"
      ? lastRefreshedAt
      : null,
    next_scheduled_at: null,
    detail: [
      check.value_atual ? `valor=${check.value_atual}` : null,
      check.threshold ? `limite=${check.threshold}` : null,
      check.severidade ? `severidade=${check.severidade}` : null,
    ].filter(Boolean).join("; ") ||
      "Sem detalhe retornado pela fonte canônica.",
    source: "rupture_health_check",
  }));

  const freshnessCheck = components.find((component) =>
    component.id === "C06_VELOCITY_FRESCA"
  );
  const freshnessStatus = lastRefreshedAt
    ? (freshnessCheck?.status ??
      worstStatus(components.map((component) => component.status)))
    : "UNKNOWN";

  return {
    version: 1,
    checked_at: checkedAt,
    freshness: {
      last_refreshed_at: lastRefreshedAt,
      status: freshnessStatus,
      semantics: "read_model_refresh",
    },
    components,
  };
}
