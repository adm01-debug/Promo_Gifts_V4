/**
 * Configuração centralizada de status de `password_reset_requests`.
 * Fonte única de verdade para a máquina de estados das solicitações de reset
 * de senha — mesmo padrão de `quote-status-config.ts`.
 *
 * Autoridade DB: o CHECK `password_reset_requests_status_check` (migration
 * 20260522113250_lote_a_03) restringe o conjunto a
 * {pending, approved, rejected}. A decisão do gestor é terminal: para
 * re-decidir, cria-se nova solicitação (o app já impede pending duplicado
 * por e-mail em `usePasswordResetRequests.createRequest`).
 */

export type PasswordResetStatus = 'approved' | 'pending' | 'rejected';

export const PASSWORD_RESET_VALID_TRANSITIONS: Readonly<
  Record<PasswordResetStatus, readonly PasswordResetStatus[]>
> = {
  pending: ['approved', 'rejected'],
  approved: [],
  rejected: [],
};

/** Returns true se a transição from → to é permitida pela máquina. */
export function isValidPasswordResetTransition(
  from: PasswordResetStatus,
  to: PasswordResetStatus,
): boolean {
  const transitions = PASSWORD_RESET_VALID_TRANSITIONS[from];
  if (!transitions) return false;
  return (transitions as readonly string[]).includes(to);
}

const STATUS_LABEL: Record<PasswordResetStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
};

/** Lança erro descritivo quando a transição não é permitida (defesa em profundidade). */
export function assertPasswordResetTransition(
  from: PasswordResetStatus,
  to: PasswordResetStatus,
): void {
  if (from !== to && !isValidPasswordResetTransition(from, to)) {
    const fromLabel = STATUS_LABEL[from] ?? from;
    const toLabel = STATUS_LABEL[to] ?? to;
    throw new Error(`Transição de status inválida: "${fromLabel}" → "${toLabel}"`);
  }
}
