/**
 * discountApprovalResponder — decisão do admin sobre solicitação de desconto.
 * Extraído de useDiscountApproval.ts (file-size ratchet, padrão postLoginGuards).
 */
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logRlsDenial } from '@/lib/security/rls-denial-logger';
import { logger } from '@/lib/logger';
interface ResponderDeps {
  user: { id: string } | null;
  invalidateWidget: () => void;
}

export type RespondToApproval = (
  requestId: string,
  approved: boolean,
  adminNotes?: string,
  expectedVersion?: number,
) => Promise<boolean>;

function approvalDecisionErrorMessage(error: unknown): string {
  const candidate = (error ?? {}) as { code?: string; message?: string };
  const code = candidate.code ?? '';
  const message = candidate.message ?? '';
  if (code === '23514' && /snapshot|percentual/i.test(message)) {
    return 'O orçamento mudou após a solicitação. Atualize a fila e solicite uma nova aprovação.';
  }
  if (code === '23514' && /decisão terminal conflitante/i.test(message)) {
    return 'Esta solicitação já recebeu outra decisão. Atualize a fila antes de continuar.';
  }
  if (code === '40001') {
    return 'A solicitação mudou durante a decisão. Atualize a fila e tente novamente.';
  }
  if (code === 'P0002') {
    return 'Solicitação não encontrada. Atualize a fila de aprovações.';
  }
  return 'Erro ao responder solicitação';
}

// `expectedVersion` = version lida junto com a linha exibida — a RPC rejeita
// (40001) se a solicitação mudou entre a leitura e a decisão.
export function createRespondToApproval({
  user,
  invalidateWidget,
}: ResponderDeps): RespondToApproval {
  return async (requestId, approved, adminNotes, expectedVersion) => {
    if (!user) return false;
    try {
      if (typeof supabase.rpc === 'function') {
        const rpcArgs = {
          _request_id: requestId,
          _approved: approved,
          _admin_notes: adminNotes?.trim() || undefined,
        };
        // Só envia quando a linha lida tem version — antes do apply da
        // migration o 4º arg não existe na assinatura e a chamada
        // quebraria; sem ele a RPC segue o caminho retrocompatível.
        // (types.ts ainda não lista _expected_version — Object.assign
        // evita excess-property check até o types ser regerado.)
        const { error } = await supabase.rpc(
          'respond_discount_approval_transactional',
          expectedVersion === undefined
            ? rpcArgs
            : Object.assign(rpcArgs, { _expected_version: expectedVersion }),
        );
        if (error) {
          await logRlsDenial(error, {
            table: 'discount_approval_requests',
            op: 'UPDATE',
            endpoint: 'useDiscountApproval.respondToApproval.rpc',
            targetId: requestId,
            policyHint: 'respond_discount_approval_transactional',
            querySummary: `decision=${approved ? 'approved' : 'rejected'}`,
          });
          throw error;
        }
        toast.success(approved ? 'Desconto aprovado!' : 'Desconto rejeitado');
        invalidateWidget();
        return true;
      }

      const validUntilDate = approved
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : null;

      let fallbackQuery = supabase
        // rls-allow: fluxo de aprovação admin/seller; RLS filtra por papel
        .from('discount_approval_requests')
        .update({
          status: approved ? 'approved' : 'rejected',
          admin_id: user.id,
          admin_notes: adminNotes || null,
          responded_at: new Date().toISOString(),
          valid_until: validUntilDate,
        })
        .eq('id', requestId)
        .eq('status', 'pending');
      // Mesmo optimistic locking da RPC: 0 linhas afetadas por
      // divergência de version → PGRST116 em .single() → erro.
      // .filter aceita coluna não presente nos types gerados (version
      // só entra no types.ts após o apply da migration).
      if (expectedVersion !== undefined) {
        fallbackQuery = fallbackQuery.filter('version', 'eq', expectedVersion);
      }
      const { data: request, error: updateError } = await fallbackQuery.select().single();
      if (updateError) {
        await logRlsDenial(updateError, {
          table: 'discount_approval_requests',
          op: 'UPDATE',
          endpoint: 'useDiscountApproval.respondToApproval',
          targetId: requestId,
          policyHint: 'dar_update_scope',
          querySummary: `decision=${approved ? 'approved' : 'rejected'}`,
        });
        throw updateError;
      }

      // Update quote status: approved → pending (ready to send), rejected → draft (needs adjustment)
      const newStatus = approved ? 'pending' : 'draft';
      const quoteUpdateResult = await supabase
        // rls-allow: fluxo de aprovação admin/seller; RLS filtra por papel
        .from('quotes')
        .update({ status: newStatus })
        .eq('id', request.quote_id);

      if (quoteUpdateResult.error) {
        logger.error('Failed to update quote status:', quoteUpdateResult.error);
        // Compensação de melhor esforço: mantém o DAR pendente se a segunda
        // escrita falhar. A atomicidade real entre tabelas requer RPC/trigger
        // dedicado; não existe transação multi-tabela no cliente PostgREST.
        const { error: compensationError } = await supabase
          .from('discount_approval_requests')
          .update({
            status: 'pending',
            admin_id: null,
            admin_notes: null,
            responded_at: null,
            valid_until: null,
          })
          .eq('id', requestId)
          .eq('status', approved ? 'approved' : 'rejected');
        if (compensationError) {
          logger.error('Failed to compensate discount approval decision:', compensationError);
        }
        throw quoteUpdateResult.error;
      }

      // O histórico só é registrado depois que o estado do orçamento foi
      // confirmado. Assim, uma falha da escrita principal não produz uma
      // trilha de auditoria ou notificação contraditória.
      const { error: historyError } = await supabase.from('quote_history').insert({
        quote_id: request.quote_id,
        user_id: user.id,
        action: approved ? 'discount_approved' : 'discount_rejected',
        description: approved
          ? `Desconto de ${request.requested_discount_percent}% aprovado pelo admin`
          : `Desconto de ${request.requested_discount_percent}% rejeitado pelo admin`,
        field_changed: 'discount',
        old_value: `${request.max_allowed_percent}%`,
        new_value: `${request.requested_discount_percent}%`,
        metadata: {
          admin_notes: adminNotes || null,
          status: approved ? 'approved' : 'rejected',
        },
      });

      if (historyError) {
        logger.error('Failed to log quote history:', historyError);
      }

      // O trigger canônico trg_notify_discount_approval notifica o vendedor
      // na transição pending -> approved/rejected. Não duplicar pelo cliente.

      toast.success(approved ? 'Desconto aprovado!' : 'Desconto rejeitado');
      invalidateWidget();
      return true;
    } catch (err) {
      logger.error('Error responding to approval:', err);
      toast.error(approvalDecisionErrorMessage(err), { duration: 8000 });
      return false;
    }
  };
}
