/**
 * SSOT do sinal "usuário dispensou o MFA Challenge (Voltar)".
 *
 * Contrato:
 *  - Persistido em `sessionStorage` (escopo da aba).
 *  - Escopado por `userId` para não vazar entre contas na mesma máquina.
 *  - Consumido por `AdminRoute` e `DevRoute`: quando marcado e a sessão
 *    ainda estiver em `aal1`, o guard redireciona para "/" em vez de
 *    reabrir o `MfaChallengeDialog` (previne loop de reativação).
 *  - Limpo automaticamente quando a sessão atinge `aal2` (via `clearIfElevated`),
 *    ao trocar de usuário ou ao fazer logout.
 *
 * `sessionStorage` (não `localStorage`) por design:
 *  - Não deve sobreviver ao fechamento da aba — nova aba pede MFA de novo.
 *  - Não vaza entre janelas do mesmo perfil de navegador.
 */

const KEY_PREFIX = 'mfa-challenge-dismissed:';

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

export function markDismissed(userId: string | null | undefined): void {
  if (!userId) return;
  const ss = safeSession();
  if (!ss) return;
  try {
    ss.setItem(keyFor(userId), '1');
  } catch {
    /* modo privado / cota — falha silenciosa é aceitável */
  }
}

export function isDismissed(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const ss = safeSession();
  if (!ss) return false;
  try {
    return ss.getItem(keyFor(userId)) === '1';
  } catch {
    return false;
  }
}

export function clearDismissed(userId: string | null | undefined): void {
  if (!userId) return;
  const ss = safeSession();
  if (!ss) return;
  try {
    ss.removeItem(keyFor(userId));
  } catch {
    /* noop */
  }
}

/**
 * Limpa o flag quando a sessão já está elevada (aal2) — evita que um flag
 * antigo continue redirecionando após o usuário verificar MFA por outro
 * caminho (ex.: outra aba).
 */
export function clearIfElevated(
  userId: string | null | undefined,
  currentAAL: string | null | undefined,
): void {
  if (currentAAL === 'aal2') clearDismissed(userId);
}
