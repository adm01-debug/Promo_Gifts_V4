/**
 * Regras puras da visao de cota de IA por usuario em /admin/consumo-ia.
 *
 * A cota efetiva de cada usuario (limite do papel, usado no mes, restante,
 * sucesso/erro, pendentes e ultima atividade) sai de
 * `public.fn_admin_ai_quota_summary` — wrapper guardado por
 * `is_admin_or_above` em volta da agregacao de `fn_ai_quota_summary`, cujo
 * EXECUTE e exclusivo de `service_role` (baseline :116233). Contrato da RPC:
 * `remaining = -1` significa cota ilimitada; `monthly_limit = 0` combinado com
 * `is_unlimited = false` significa que o papel nao tem cota configurada.
 */

export interface AiQuotaRow {
  userId: string;
  email: string | null;
  role: string;
  monthlyLimit: number;
  isUnlimited: boolean;
  usedThisMonth: number;
  remaining: number;
  successMonth: number;
  errorMonth: number;
  pendingCount: number;
  lastActivity: string | null;
}

export interface AiQuotaSummary {
  usuarios: number;
  ilimitados: number;
  estourados: number;
  pendentes: number;
  ultimaAtividade: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  dev: 'Dev',
  supervisor: 'Supervisor',
  vendedor: 'Agente',
  admin: 'Supervisor (legado)',
  manager: 'Supervisor (legado)',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function toInt(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.trunc(value) : null;
  }
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    return Math.trunc(Number(value.trim()));
  }
  return null;
}

function toBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.trim().toLowerCase() === 'true';
  return false;
}

/** Linhas sem `user_id` sao descartadas (payload parcial do PostgREST). */
export function parseAiQuotaRows(value: unknown): AiQuotaRow[] {
  if (!Array.isArray(value)) return [];
  const rows: AiQuotaRow[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const userId = toText(item.user_id);
    if (!userId) continue;
    rows.push({
      userId,
      email: toText(item.email),
      role: toText(item.role) ?? 'desconhecido',
      monthlyLimit: toInt(item.monthly_limit) ?? 0,
      isUnlimited: toBool(item.is_unlimited),
      usedThisMonth: toInt(item.used_this_month) ?? 0,
      remaining: toInt(item.remaining) ?? 0,
      successMonth: toInt(item.success_month) ?? 0,
      errorMonth: toInt(item.error_month) ?? 0,
      pendingCount: toInt(item.pending_count) ?? 0,
      lastActivity: toText(item.last_activity),
    });
  }
  return rows;
}

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

/** `remaining = -1` e o contrato da RPC para cota ilimitada. */
export function isQuotaUnlimited(row: AiQuotaRow): boolean {
  return row.isUnlimited || row.remaining < 0;
}

/** Cota cheia: limite configurado, nao ilimitado e sem chamada restante no mes. */
export function isQuotaExhausted(row: AiQuotaRow): boolean {
  return !isQuotaUnlimited(row) && row.remaining === 0;
}

/** Percentual usado no mes; `null` quando a cota e ilimitada (nao existe denominador). */
export function usagePercent(row: AiQuotaRow): number | null {
  if (isQuotaUnlimited(row)) return null;
  if (row.monthlyLimit <= 0) return row.usedThisMonth > 0 ? 100 : 0;
  const percent = Math.round((row.usedThisMonth / row.monthlyLimit) * 100);
  return Math.min(100, Math.max(0, percent));
}

export function describeRemaining(row: AiQuotaRow): string {
  if (isQuotaUnlimited(row)) return 'ilimitado';
  if (row.remaining === 0) return 'esgotado';
  return String(row.remaining);
}

export function summarizeAiQuota(rows: readonly AiQuotaRow[]): AiQuotaSummary {
  let ilimitados = 0;
  let estourados = 0;
  let pendentes = 0;
  let ultimaAtividade: string | null = null;
  for (const row of rows) {
    if (isQuotaUnlimited(row)) ilimitados += 1;
    if (isQuotaExhausted(row)) estourados += 1;
    pendentes += row.pendingCount;
    if (row.lastActivity && (ultimaAtividade === null || row.lastActivity > ultimaAtividade)) {
      ultimaAtividade = row.lastActivity;
    }
  }
  return { usuarios: rows.length, ilimitados, estourados, pendentes, ultimaAtividade };
}

/**
 * Traduz o erro do PostgREST para linguagem de operacao. A RPC levanta 42501
 * para nao-admin e, em ambiente sem a migration aplicada, o PostgREST devolve
 * PGRST202 (funcao inexistente no cache de schema).
 */
export function describeQuotaError(error: unknown): string {
  if (!isRecord(error)) return 'Falha ao carregar a cota de IA por usuario. Tente novamente.';
  const code = toText(error.code);
  const message = toText(error.message);
  if (code === '42501') {
    return 'Sem permissao para ver a cota de IA por usuario. Confirme se sua conta e administradora.';
  }
  if (code === 'PGRST202' || (message !== null && /could not find the function/i.test(message))) {
    return 'A visao de cota por usuario depende da migration 20261126191200_admin_ai_quota_summary_rpc, ainda nao aplicada neste ambiente.';
  }
  const prefix = 'Falha ao carregar a cota de IA por usuario.';
  return message ? `${prefix} ${message}` : `${prefix} Tente novamente.`;
}
