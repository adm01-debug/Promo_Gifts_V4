
-- =============================================================
-- MIGRATION: fix_discount_approval_audit_percent_checks
-- GAP ENCONTRADO: discount_approval_audit aceitava percentuais
-- negativos e > 100% sem nenhum CHECK constraint de range.
-- discount_approval_requests já tem esses checks, mas a tabela
-- de audit (que é snapshot histórico) não replicava a validação.
-- Isso criava inconsistência: dados inválidos podiam ser gravados
-- no audit mas não na tabela-origem.
-- ANTI-REGRESSION: fix_version dar_audit_percent_checks_v1
-- =============================================================

ALTER TABLE public.discount_approval_audit
  ADD CONSTRAINT daa_requested_percent_range
    CHECK (requested_discount_percent IS NULL OR
           (requested_discount_percent >= 0 AND requested_discount_percent <= 100)),
  ADD CONSTRAINT daa_max_allowed_percent_range
    CHECK (max_allowed_percent IS NULL OR
           (max_allowed_percent >= 0 AND max_allowed_percent <= 100)),
  ADD CONSTRAINT daa_real_discount_percent_range
    CHECK (real_discount_percent IS NULL OR
           (real_discount_percent >= 0 AND real_discount_percent <= 100));

NOTIFY pgrst, 'reload schema';
;
