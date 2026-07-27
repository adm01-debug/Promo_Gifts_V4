/**
 * degradation — SSOT para degradação parcial de queries analíticas.
 *
 * Contexto (H1 do relatório qa/INTELIGENCIA_COMERCIAL_ERROR_BOUNDARY_REPORT.md):
 * os hooks de Inteligência Comercial lançavam `throw` para QUALQUER erro do
 * PostgREST. Como TanStack Query re-lança o erro no render, uma negação de RLS
 * em um único bloco derrubava a rota inteira.
 *
 * Regra: erros ESTRUTURAIS e esperados (permissão negada, relação inexistente,
 * quota) NÃO são falhas do app — o bloco degrada para vazio e registra
 * telemetria. Erros TRANSITÓRIOS/desconhecidos (rede, timeout, 5xx) continuam
 * sendo lançados para que o retry do TanStack Query atue e, se persistirem,
 * o SectionErrorBoundary local isole o bloco.
 */
import { logger } from '@/lib/logger';

export type DegradationReason =
  | 'missing_relation'
  | 'permission_denied'
  | 'quota_exceeded'
  | 'schema_mismatch';

interface SupabaseLikeError {
  code?: string | null;
  message?: string | null;
  status?: number | null;
  details?: string | null;
}

/** Códigos PostgreSQL/PostgREST tratados como degradáveis (não-fatais). */
const CODE_MAP: Record<string, DegradationReason> = {
  // PostgreSQL
  '42501': 'permission_denied', // insufficient_privilege
  '42P01': 'missing_relation', // undefined_table
  '42703': 'schema_mismatch', // undefined_column
  '42883': 'missing_relation', // undefined_function (RPC ausente)
  // PostgREST
  PGRST202: 'missing_relation', // função não encontrada no schema cache
  PGRST205: 'missing_relation', // tabela não encontrada no schema cache
  PGRST301: 'permission_denied', // JWT inválido/expirado no contexto da query
  PGRST116: 'schema_mismatch', // resultado não corresponde ao esperado
};

/**
 * Classifica um erro como degradável. Retorna `null` quando o erro deve ser
 * propagado (transitório/desconhecido).
 */
export function classifyDegradable(error: unknown): DegradationReason | null {
  if (!error || typeof error !== 'object') return null;
  const e = error as SupabaseLikeError;

  const code = typeof e.code === 'string' ? e.code : '';
  if (code && CODE_MAP[code]) return CODE_MAP[code];

  if (e.status === 401 || e.status === 403) return 'permission_denied';
  if (e.status === 429 || code === '429') return 'quota_exceeded';

  const msg = (e.message ?? '').toLowerCase();
  if (!msg) return null;
  if (msg.includes('permission denied') || msg.includes('row-level security')) {
    return 'permission_denied';
  }
  if (msg.includes('does not exist') || msg.includes('could not find the')) {
    return 'missing_relation';
  }
  if (msg.includes('too many requests') || msg.includes('rate limit')) {
    return 'quota_exceeded';
  }
  return null;
}

/**
 * Degrada ou propaga. Use no lugar de `if (error) throw error;`:
 *
 *   const { data, error } = await supabase.from('orders').select('...');
 *   if (error) return degradeOrThrow(error, 'segments.orders', [] as SegmentData[]);
 *
 * @param error    erro retornado pelo client
 * @param scope    identificador estável do bloco (usado na telemetria)
 * @param fallback valor degradado retornado quando o erro é estrutural
 * @throws o erro original quando ele é transitório/desconhecido
 */
export function degradeOrThrow<T>(error: unknown, scope: string, fallback: T): T {
  const reason = classifyDegradable(error);
  if (!reason) throw error;

  const e = error as SupabaseLikeError;
  logger.warn('intelligence_block_degraded', {
    scope,
    reason,
    code: e.code ?? null,
  });
  return fallback;
}
