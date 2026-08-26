/**
 * mfaNavigationAnalytics — telemetria do botão "Voltar" do MfaChallengeDialog
 * e do redirecionamento de loop-break nos guards (AdminRoute/DevRoute).
 *
 * Objetivo: detectar em produção gaps de navegação — casos em que o usuário
 * dispensa o challenge e cai em rota errada, em loop, ou onde o histórico
 * interno não é confiável (deep link, nova aba, referrer externo).
 *
 * Segue o padrão dos outros módulos de analytics do projeto:
 *  - logger estruturado (`createClientLogger`) para observabilidade,
 *  - buffer `window.__e2eAnalytics__` para asserts em E2E,
 *  - `CustomEvent('lovable:analytics')` para consumidores externos.
 *
 * Não coleta PII: só userId hash-free (já presente nos logs de auth do
 * projeto), rotas internas e a estratégia de resolução.
 */
import { createClientLogger } from '@/lib/telemetry/structuredLogger';

const log = createClientLogger('security.mfa_nav');

const E2E_BUFFER_KEY = '__e2eAnalytics__';
const E2E_BUFFER_LIMIT = 200;

/** Como o destino do "Voltar" foi resolvido. */
export type GoBackStrategy =
  /** `history.state.idx > 0` do React Router → `navigate(-1)`. */
  | 'history_back'
  /** Nenhum histórico interno confiável → fallback "/". */
  | 'home_fallback'
  /** Rota interna segura lembrada em sessionStorage (SSOT lastInternalRoute). */
  | 'remembered_route';

/** Origem da entrada na rota gated, inferida no momento do "Voltar". */
export type GoBackOrigin =
  /** Deep link / nova aba: idx === 0 e sem rota lembrada. */
  | 'deep_link'
  /** Chegou via referrer externo (documento com referrer de outra origem). */
  | 'external_referrer'
  /** Navegação interna do app (idx > 0 e/ou rota lembrada presente). */
  | 'internal'
  | 'unknown';

export interface MfaGoBackPayload {
  /** Rota gated de onde o usuário clicou "Voltar". */
  fromPath: string;
  /** Destino efetivo (path) ou `-1` quando delegado ao histórico. */
  toPath: string;
  /** Rota lembrada disponível no momento do clique (null se ausente). */
  rememberedRoute: string | null;
  /** `history.state.idx` do React Router (heurística de histórico interno). */
  historyIdx: number;
  /** Origem inferida da entrada na rota gated. */
  origin: GoBackOrigin;
  /** Estratégia usada para resolver o destino. */
  strategy: GoBackStrategy;
  /** Referrer da mesma origem? (false quando externo ou vazio). */
  sameOriginReferrer: boolean;
  /** Guard que motivou o dialog, quando conhecido. */
  guard?: 'admin' | 'dev' | null;
}

export interface MfaGuardRedirectPayload {
  guard: 'admin' | 'dev';
  /** Rota gated que o guard reavaliou após o "Voltar". */
  fromPath: string;
  /** Destino do redirect de loop-break. */
  toPath: string;
  /** Rota lembrada no momento do redirect. */
  rememberedRoute: string | null;
}

export type MfaNavigationEvent =
  | { name: 'mfa.challenge_go_back'; ts: string; payload: MfaGoBackPayload }
  | { name: 'mfa.guard_dismissed_redirect'; ts: string; payload: MfaGuardRedirectPayload };

function pushToBuffer(event: MfaNavigationEvent): void {
  if (typeof window === 'undefined') return;
  try {
    const w = window as unknown as Record<string, unknown>;
    const buf = (w[E2E_BUFFER_KEY] as MfaNavigationEvent[] | undefined) ?? [];
    buf.push(event);
    if (buf.length > E2E_BUFFER_LIMIT) buf.splice(0, buf.length - E2E_BUFFER_LIMIT);
    w[E2E_BUFFER_KEY] = buf;
  } catch {
    /* buffer é best-effort — nunca deve quebrar a navegação */
  }
}

function dispatch(event: MfaNavigationEvent): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('lovable:analytics', { detail: event }));
  } catch {
    /* noop */
  }
}

/** Referrer é da mesma origem? Usado para distinguir deep link externo. */
export function hasSameOriginReferrer(): boolean {
  if (typeof document === 'undefined') return false;
  const ref = document.referrer;
  if (!ref) return false;
  try {
    return new URL(ref).origin === window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Infere a origem da entrada na rota gated a partir dos sinais disponíveis.
 * Puro e testável — não lê `window` diretamente.
 */
export function inferGoBackOrigin(input: {
  historyIdx: number;
  rememberedRoute: string | null;
  sameOriginReferrer: boolean;
}): GoBackOrigin {
  const { historyIdx, rememberedRoute, sameOriginReferrer } = input;
  if (historyIdx > 0 || rememberedRoute) return 'internal';
  if (sameOriginReferrer) return 'internal';
  if (typeof document !== 'undefined' && document.referrer) return 'external_referrer';
  if (historyIdx === 0) return 'deep_link';
  return 'unknown';
}

/** Registra o clique em "Voltar" com origem, rota anterior e resultado. */
export function trackMfaGoBack(payload: MfaGoBackPayload): void {
  const event: MfaNavigationEvent = {
    name: 'mfa.challenge_go_back',
    ts: new Date().toISOString(),
    payload,
  };
  pushToBuffer(event);
  dispatch(event);
  log.info('mfa_go_back', {
    from_path: payload.fromPath,
    to_path: payload.toPath,
    strategy: payload.strategy,
    origin: payload.origin,
    history_idx: payload.historyIdx,
    remembered_route: payload.rememberedRoute,
    same_origin_referrer: payload.sameOriginReferrer,
    guard: payload.guard ?? null,
  });
}

/**
 * Registra o redirect de loop-break dos guards. Sinaliza como `warn` quando o
 * destino cai em "/" apesar de existir rota lembrada — indício de gap.
 */
export function trackMfaGuardDismissedRedirect(payload: MfaGuardRedirectPayload): void {
  const event: MfaNavigationEvent = {
    name: 'mfa.guard_dismissed_redirect',
    ts: new Date().toISOString(),
    payload,
  };
  pushToBuffer(event);
  dispatch(event);
  const fields = {
    guard: payload.guard,
    from_path: payload.fromPath,
    to_path: payload.toPath,
    remembered_route: payload.rememberedRoute,
  };
  if (payload.toPath === '/' && payload.rememberedRoute) {
    log.warn('mfa_guard_redirect_degraded', fields);
  } else {
    log.info('mfa_guard_redirect', fields);
  }
}
