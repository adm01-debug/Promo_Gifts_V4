
-- =============================================================================
-- FIX: Restaurar trigger trg_notify_quote_status_change em quotes
-- =============================================================================
-- BUG: A faxina tier3b (2026-06-20) arquivou notify_quote_status_change, o que
-- dropou automaticamente o trigger em quotes. A função foi recriada em public
-- em 2026-06-22 (fix_qbp_audit_novo_orcamento) mas o trigger NÃO foi recriado.
-- IMPACTO: mudanças de status em orçamentos (approved, rejected, sent, expired,
-- pending_approval, converted, cancelled) não disparam workspace_notifications
-- para os vendedores.
-- DESCOBERTO: auditoria adversarial 2026-06-23.
-- =============================================================================

DROP TRIGGER IF EXISTS trg_notify_quote_status_change ON public.quotes;

CREATE TRIGGER trg_notify_quote_status_change
AFTER UPDATE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.notify_quote_status_change();
;
