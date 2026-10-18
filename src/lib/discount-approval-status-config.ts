/**
 * Configuração centralizada de status de `discount_approval_requests` (DAR).
 * Fonte única de verdade para a máquina de estados das solicitações de
 * aprovação de desconto — mesmo padrão de `quote-status-config.ts`.
 *
 * Autoridade DB (máquina já imposta por triggers/RPC — FE deve ser SUBCONJUNTO):
 *  - `fn_dar_enforce_initial_status` (migration 20260625221758): INSERT só nasce
 *    com status 'pending'.
 *  - `validate_discount_approval_status` (migration 20260414193435): rejeita
 *    qualquer status fora de {pending, approved, rejected} — 'expired' é
 *    reservado p/ automação DB (o CHECK da coluna espelho
 *    `quotes.discount_approval_status` e o evento de auditoria já o preveem,
 *    mas nenhum caminho do app o escreve hoje).
 *  - `fn_dar_forbid_reopen` (migration 20260626123656): proíbe terminal ->
 *    'pending' (re-decisão = nova solicitação).
 *  - `respond_discount_approval_transactional` (migration 20260829111000):
 *    levanta 'Decisão terminal conflitante' se a linha não está 'pending'.
 *
 * Por isso approved/rejected são terminais e 'expired' só existe como estado
 * lido (espelho/auditoria) — nunca como alvo de transição do FE.
 */

export type DiscountApprovalStatus = 'approved' | 'expired' | 'pending' | 'rejected';

export const DAR_VALID_TRANSITIONS: Readonly<
  Record<DiscountApprovalStatus, readonly DiscountApprovalStatus[]>
> = {
  pending: ['approved', 'rejected'],
  approved: [],
  rejected: [],
  expired: [],
};

/** Status escrito pela decisão do admin — SSOT do ternário `approved ? ... : ...`. */
export function darDecisionTarget(approved: boolean): 'approved' | 'rejected' {
  return approved ? 'approved' : 'rejected';
}

/** Returns true se a transição from → to é permitida pela máquina do DAR. */
export function isValidDiscountApprovalTransition(
  from: DiscountApprovalStatus,
  to: DiscountApprovalStatus,
): boolean {
  const transitions = DAR_VALID_TRANSITIONS[from];
  if (!transitions) return false;
  return (transitions as readonly string[]).includes(to);
}

const STATUS_LABEL: Record<DiscountApprovalStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  expired: 'Expirado',
};

/**
 * Lança erro descritivo quando a transição não é permitida. Usado como
 * defesa-em-profundidade nos pontos de escrita do FE (a autoridade final é o
 * banco — ver cabeçalho do arquivo).
 */
export function assertDiscountApprovalTransition(
  from: DiscountApprovalStatus,
  to: DiscountApprovalStatus,
): void {
  if (from !== to && !isValidDiscountApprovalTransition(from, to)) {
    const fromLabel = STATUS_LABEL[from] ?? from;
    const toLabel = STATUS_LABEL[to] ?? to;
    throw new Error(`Transição de status inválida: "${fromLabel}" → "${toLabel}"`);
  }
}
