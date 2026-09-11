
-- ══════════════════════════════════════════════════════════════════
-- MIGRATION: fix_db_connection_snapshots_rls_and_anon_grants
-- Autor: Claude (2026-06-23) — Detectado via fn_run_smoke_tests()
-- Severidade: CRÍTICA
--
-- PROBLEMA:
--   'db_connection_snapshots' não tem RLS ativado.
--   'anon' tinha ALL PRIVILEGES (DELETE, INSERT, SELECT, UPDATE, etc).
--   A tabela contém:
--     - total_conns, active_conns, usage_pct (métricas de performance do DB)
--     - top_users (JSONB com usernames de conexão e contagens) ← CRÍTICO
--     - alert_sent (estado de alertas)
--
--   Qualquer usuário não-autenticado podia:
--     1. LER top_users → descobrir usernames internos do banco
--     2. LER connection patterns → mapear horários de pico
--     3. DELETAR snapshots → destruir histórico de monitoramento
--     4. INSERIR dados falsos → corromper métricas
--
-- SOLUÇÃO:
--   1. Revogar ALL de anon
--   2. Ativar RLS
--   3. Policy: apenas authenticated pode SELECT (leitura de monitoramento)
--      service_role já bypassa RLS (writes do pg_cron continuam funcionando)
-- ══════════════════════════════════════════════════════════════════

-- 1. Revogar todos os grants de anon (dados sensíveis de infra nunca devem ser anon)
REVOKE ALL PRIVILEGES ON public.db_connection_snapshots FROM anon;

-- 2. Ativar RLS
ALTER TABLE public.db_connection_snapshots ENABLE ROW LEVEL SECURITY;

-- 3. Policy SELECT para authenticated (admins/devs monitorando o sistema)
--    service_role bypassa RLS automaticamente → pg_cron writes não são afetados
CREATE POLICY "dcs_select_authenticated"
  ON public.db_connection_snapshots
  FOR SELECT
  TO authenticated
  USING (true);

-- Nota: Sem policy INSERT/UPDATE/DELETE para authenticated, pois esses dados
-- são gerenciados exclusivamente pelo pg_cron (via service_role que bypassa RLS).
-- authenticated pode apenas LER, nunca modificar.

-- 4. Reload PostgREST
NOTIFY pgrst, 'reload schema';
;
