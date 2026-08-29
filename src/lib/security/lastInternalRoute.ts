/**
 * SSOT da "última rota interna segura" — usada pelo MfaChallengeDialog
 * para restaurar exatamente onde o usuário estava ao clicar "Voltar",
 * mesmo quando `history.state.idx` é curto (ex.: entrada direta, deep link,
 * abertura em nova aba, ou mudanças de stack por replace/redirect).
 *
 * Regras:
 *  - Persistido em `sessionStorage` (escopo da aba, escopado por userId).
 *  - Só armazena rotas que NÃO são gated por AAL2 e não são rotas de auth
 *    (senão o "Voltar" reabriria o próprio dialog ou a tela de login).
 *  - Ignora a rota atual quando o guard está prestes a mostrar o challenge.
 */

const KEY_PREFIX = 'mfa-last-internal-route:';

/**
 * Prefixos que exigem AAL2 (ou não fazem sentido como retorno seguro).
 * Manter em sincronia com AdminRoute/DevRoute + rotas de auth.
 */
const UNSAFE_PREFIXES = ['/admin', '/dev', '/auth', '/login', '/logout', '/reset-password'];

function safeSession(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

function keyFor(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

export function isSafeReturnPath(path: string | null | undefined): boolean {
  if (!path?.startsWith('/')) return false;
  return !UNSAFE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

export function rememberLastInternalRoute(userId: string | null | undefined, path: string): void {
  if (!userId || !isSafeReturnPath(path)) return;
  const ss = safeSession();
  if (!ss) return;
  try {
    ss.setItem(keyFor(userId), path);
  } catch {
    /* modo privado / cota — noop */
  }
}

export function getLastInternalRoute(userId: string | null | undefined): string | null {
  if (!userId) return null;
  const ss = safeSession();
  if (!ss) return null;
  try {
    const value = ss.getItem(keyFor(userId));
    return isSafeReturnPath(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * Destino seguro para redirecionar quando um guard (AdminRoute/DevRoute)
 * reavalia permissões após o usuário ter dispensado o challenge.
 *
 * Prioriza a última rota interna lembrada; cai em "/" quando não houver
 * rota válida ou quando ela coincidir com a rota atualmente bloqueada
 * (evita redirect em loop para a própria rota gated).
 */
export function resolveSafeReturnPath(
  userId: string | null | undefined,
  currentPath?: string | null,
): string {
  const remembered = getLastInternalRoute(userId);
  if (!remembered) return '/';
  if (currentPath && (remembered === currentPath || remembered.startsWith(`${currentPath}?`))) {
    return '/';
  }
  return remembered;
}

export function clearLastInternalRoute(userId: string | null | undefined): void {
  if (!userId) return;
  const ss = safeSession();
  if (!ss) return;
  try {
    ss.removeItem(keyFor(userId));
  } catch {
    /* noop */
  }
}
