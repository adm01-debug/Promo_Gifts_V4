-- ============================================================================
-- audit_log — Trilha de auditoria GENÉRICA por entidade (application-level)
-- ----------------------------------------------------------------------------
-- MOTIVO: O frontend (src/hooks/admin/useAuditLog.ts -> logAction /
--   fetchAuditHistory / fetchAllAuditLogs) lê e escreve em public.audit_log,
--   mas a tabela NUNCA existiu neste projeto (Gold doufsxqlfjyuvxuezpln).
--   Resultado: PGRST205 "Could not find the table 'public.audit_log'" no
--   AdminProductFormPage (histórico de auditoria do produto) -> 404 + erro.
-- CONTRATO: id, user_id(FK profiles), action(INSERT/UPDATE/DELETE), entity_type,
--   entity_id(uuid), old_values/new_values(jsonb), ip_address(inet),
--   user_agent, created_at. Embed PostgREST exige FK user_id->profiles.
-- SEGURANÇA (espelha admin_audit_log, com hardening):
--   * RLS ON; INSERT self-attributed (auth.uid()=user_id) p/ NÃO quebrar
--     editores org-owner que não são supervisores globais; SELECT dev-only
--     (can_view_audit_logs); SEM UPDATE/DELETE (imutável).
--   * Grants: anon=∅, authenticated=SELECT,INSERT, service_role=ALL.
-- POPULAÇÃO: application-level (a app escreve via cliente autenticado).
--   NÃO adicionar triggers de auditoria aqui — duplicaria as escritas da app.
-- fix_version: 2026-06-26 audit_log_create
-- ANTI-REGRESSÃO (Lovable bot): NÃO dropar esta tabela nem suas policies ao
--   regenerar types.ts; a tabela é SSOT do histórico de auditoria por entidade.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id     uuid        NULL,
  action      text        NOT NULL,
  entity_type text        NOT NULL,
  entity_id   uuid        NOT NULL,
  old_values  jsonb       NULL,
  new_values  jsonb       NULL,
  ip_address  inet        NULL,
  user_agent  text        NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT audit_log_action_check CHECK (action IN ('INSERT','UPDATE','DELETE')),
  CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Índices: fetchAuditHistory(entity_type,entity_id ORDER BY created_at DESC);
--          fetchAllAuditLogs(created_at DESC + filtros user_id/action); FK index.
CREATE INDEX IF NOT EXISTS idx_audit_log_entity     ON public.audit_log (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id    ON public.audit_log (user_id);

-- RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_insert_self" ON public.audit_log;
CREATE POLICY "audit_log_insert_self" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "audit_log_select_dev" ON public.audit_log;
CREATE POLICY "audit_log_select_dev" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.can_view_audit_logs((SELECT auth.uid())));

-- Grants (revoga default-privileges amplos; concede o mínimo)
REVOKE ALL ON public.audit_log FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL          ON public.audit_log TO service_role;

COMMENT ON TABLE public.audit_log IS
  'Trilha de auditoria genérica por entidade (application-level), escrita por useAuditLog.logAction (INSERT/UPDATE/DELETE) e lida por fetchAuditHistory/fetchAllAuditLogs. Imutável; leitura dev-only (can_view_audit_logs); embed profiles:user_id via FK. fix_version 2026-06-26. NÃO adicionar triggers (duplicaria escritas da app).';

-- PostgREST: expor a tabela e a relação FK (embed profiles:user_id) imediatamente
NOTIFY pgrst, 'reload schema';
