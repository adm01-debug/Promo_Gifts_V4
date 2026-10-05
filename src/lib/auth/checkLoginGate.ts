/**
 * Decisão do gate server-side `check-login` (access_security_settings:
 * whitelist de IP/cidade, lockout progressivo, Turnstile).
 *
 * Extraído do AuthContext para manter o contexto dentro do ratchet de
 * tamanho e para a decisão ser testável isolada.
 */

/** Resposta da edge `check-login` (gate server-side de acesso). */
export interface CheckLoginGateResponse {
  allowed?: boolean;
  reason?: string;
  blocked_until?: string;
}

/**
 * Reasons da check-login que indicam FALHA OPERACIONAL antes de chegar na RPC
 * (edge fora, exceção interna). Nessas, o fail-open declarado é preservado.
 * `security_check_error_fail_closed` NÃO está aqui: é a decisão fail-closed
 * explícita da RPC (SEC-008) e continua bloqueando.
 */
const CHECK_LOGIN_OPERATIONAL_REASONS = new Set([
  'security_check_unavailable',
  'internal_error_fail_closed',
  'turnstile_unavailable', // siteverify inalcançável — não derruba login legítimo
]);

/** Bloqueio "falso": a edge recusou por falha operacional, não por regra. */
export function isOperationalGateBlock(gate: CheckLoginGateResponse | null | undefined): boolean {
  return (
    gate?.allowed === false &&
    gate.reason !== undefined &&
    CHECK_LOGIN_OPERATIONAL_REASONS.has(gate.reason)
  );
}

/** Mensagem exibida ao usuário quando o gate bloqueia de verdade. */
export function gateBlockMessage(gate: CheckLoginGateResponse | null | undefined): string {
  if (gate?.reason?.startsWith('turnstile_')) {
    return 'Verificação de segurança não aprovada. Resolva o desafio e tente novamente.';
  }
  const until =
    gate?.blocked_until && !Number.isNaN(Date.parse(gate.blocked_until))
      ? new Date(gate.blocked_until).toLocaleString('pt-BR')
      : null;
  return until
    ? `Login bloqueado pelas regras de segurança até ${until}.`
    : 'Login bloqueado pelas regras de segurança da organização.';
}
