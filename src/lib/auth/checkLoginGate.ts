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

/**
 * Com Turnstile ativo (site key + secret configuradas), a verificação do
 * desafio acontece DENTRO da check-login — se a edge está fora/errou, não há
 * verificação de token nenhuma e prosseguir contorna o anti-bot. Nesse caso
 * o signIn falha fechado com esta mensagem (sem Turnstile, o fail-open
 * operacional de cima continua valendo).
 */
export const TURNSTILE_GATE_UNAVAILABLE_MESSAGE =
  'Verificação de segurança indisponível no momento. Tente novamente em instantes.';

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

/** Subconjunto do client logger usado pelo gate (estrutural). */
export interface LoginGateLogger {
  headers: () => Record<string, string>;
  warn: (event: string, meta?: Record<string, unknown>) => void;
  requestId: string;
}

/** Erro a exibir quando o gate bloqueia o login; null = pode prosseguir. */
export interface LoginGateBlock {
  message: string;
  status: number;
}

/**
 * Invoca a edge `check-login` e classifica o resultado:
 * - bloqueio real (allowed=false fora das reasons operacionais) → 403;
 * - edge fora/erro COM turnstileToken → 503 fail-closed (anti-bot contornado
 *   se prosseguir); sem token → fail-open operacional com warn;
 * - turnstile_token é single-use → maxRetries 0 para não reenviar token
 *   já consumido pelo siteverify num retry.
 */
export async function evaluateLoginGate(
  log: LoginGateLogger,
  email: string,
  turnstileToken?: string,
): Promise<LoginGateBlock | null> {
  try {
    const { invokeEdge } = await import('@/lib/edge/safeInvokeCall');
    const { data: gate, error: gateErr } = await invokeEdge<CheckLoginGateResponse>('check-login', {
      // turnstile_token só é verificado pela edge quando TURNSTILE_SECRET_KEY
      // está configurada nela — sem a secret o campo é ignorado.
      body: { email, turnstile_token: turnstileToken },
      headers: log.headers(),
      timeoutMs: 6_000,
      maxRetries: turnstileToken ? 0 : 1,
      preserveErrorData: true,
    });
    const operationalBlock = isOperationalGateBlock(gate);
    if (gate?.allowed === false && !operationalBlock) {
      log.warn('login_blocked_server', {
        reason: gate?.reason ?? 'login_blocked',
        requestId: log.requestId,
      });
      return { message: gateBlockMessage(gate), status: 403 };
    }
    if (gateErr || operationalBlock || gate?.allowed === false) {
      log.warn('check_login_unavailable', {
        status: gateErr?.status,
        reason: gate?.reason,
        requestId: log.requestId,
      });
    }
    if (gateErr && turnstileToken) {
      return { message: TURNSTILE_GATE_UNAVAILABLE_MESSAGE, status: 503 };
    }
  } catch (gateEx) {
    log.warn('check_login_exception', { err: String(gateEx) });
    if (turnstileToken) {
      return { message: TURNSTILE_GATE_UNAVAILABLE_MESSAGE, status: 503 };
    }
  }
  return null;
}
