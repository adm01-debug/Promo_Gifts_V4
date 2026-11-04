-- Onda 13 (B-3): fecha audit_log_gravacao + seo_audit_log para admin only.
-- Frontend nao consulta (confirmado via code_search). Edges usam service_role (bypassa RLS).

-- audit_log_gravacao
DROP POLICY IF EXISTS audit_log_gravacao_read_authenticated ON public.audit_log_gravacao;

CREATE POLICY audit_log_gravacao_select_supervisor_or_above
ON public.audit_log_gravacao
FOR SELECT
TO authenticated
USING (
  is_supervisor_or_above((SELECT auth.uid()))
);

COMMENT ON POLICY audit_log_gravacao_select_supervisor_or_above ON public.audit_log_gravacao IS
'Onda 13 (B-3): SELECT restrito a supervisor_or_above. Audit log expoe usuario/valor_antes/depois — nao deve vazar para vendedores. Service_role (triggers SECDEF) continua bypassando.';

-- seo_audit_log
DROP POLICY IF EXISTS auth_read_seo_audit_log ON public.seo_audit_log;

CREATE POLICY seo_audit_log_select_supervisor_or_above
ON public.seo_audit_log
FOR SELECT
TO authenticated
USING (
  is_supervisor_or_above((SELECT auth.uid()))
);

COMMENT ON POLICY seo_audit_log_select_supervisor_or_above ON public.seo_audit_log IS
'Onda 13 (B-3): SELECT restrito a supervisor_or_above. Historico de auditoria SEO eh operacional interno.';
