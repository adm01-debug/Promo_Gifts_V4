-- Bug #59: /admin/observabilidade (useKillSwitchObservability) falha a cada 30s com
-- "permission denied for view v_kill_switch_hits_summary" e não mostra nem os switches.
-- Causa: 20260716000030_revoke_auth_select_admin_views (linha 104) e
-- 20260716192234_revoke_auth_select_admin_views (linha 53) revogaram SELECT de authenticated
-- nesta view (mesma lista de views admin nas duas). Em produção só service_role tem grant.
-- Esta view SAI da lista das duas migrations: quem copiar qualquer uma delas para um novo
-- "revoke admin views" deve remover 'v_kill_switch_hits_summary' da lista.
--
-- Por que esta view sai da lista de revogação (não reverter num futuro "revoke admin views"):
--   - a view é security_invoker (20260524214725: WITH (security_invoker = on); em produção o
--     catálogo grava 'security_invoker=true'): roda com o papel de quem consulta,
--     então a RLS de public.kill_switch_hits se aplica;
--   - kill_switch_hits_read_admin (SELECT, authenticated) = is_admin_or_above(auth.uid());
--     não-admin recebe 0 linhas;
--   - authenticated JÁ tem SELECT na tabela base kill_switch_hits (snapshot grants.tables),
--     logo este GRANT não expõe nenhum dado novo; só devolve o agregado ao admin.
-- anon continua revogado (20260524214802) e a RLS kill_switch_hits_anon_select_deny segue ativa.
--
-- Rollback: REVOKE SELECT ON public.v_kill_switch_hits_summary FROM authenticated;
--           (arquivo supabase/rollbacks/20261112120200_rollback.sql)

DO $$
BEGIN
  -- GUARD: só concede se a view continuar security_invoker. Se alguém recriar a view
  -- como definer, o GRANT passaria a furar a RLS de kill_switch_hits — aborta.
  -- Aceita qualquer grafia verdadeira: produção tem 'security_invoker=true', mas um banco
  -- montado pelo histórico (staging, db reset, contract-smoke) grava 'security_invoker=on'.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'v_kill_switch_hits_summary'
      AND c.relkind = 'v'
      AND EXISTS (
        SELECT 1
        FROM pg_options_to_table(c.reloptions) o
        WHERE o.option_name = 'security_invoker'
          AND lower(o.option_value) IN ('true', 'on', '1', 'yes')
      )
  ) THEN
    RAISE EXCEPTION 'public.v_kill_switch_hits_summary ausente ou sem security_invoker — GRANT abortado';
  END IF;

  -- GUARD: a RLS da tabela base precisa estar ligada para o GRANT ser seguro.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'kill_switch_hits'
      AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'RLS desligada em public.kill_switch_hits — GRANT abortado';
  END IF;
END;
$$;

GRANT SELECT ON public.v_kill_switch_hits_summary TO authenticated;

COMMENT ON VIEW public.v_kill_switch_hits_summary IS
'Resumo de kill_switch_hits. SECURITY INVOKER: respeita RLS do caller (leitura só is_admin_or_above). '
'SELECT para authenticated é intencional (20261112120200): não incluir em revogações de views admin.';

DO $$
BEGIN
  IF NOT has_table_privilege('authenticated', 'public.v_kill_switch_hits_summary', 'SELECT') THEN
    RAISE EXCEPTION 'post-check: authenticated ainda sem SELECT em v_kill_switch_hits_summary';
  END IF;
  IF has_table_privilege('anon', 'public.v_kill_switch_hits_summary', 'SELECT') THEN
    RAISE EXCEPTION 'post-check: anon com SELECT em v_kill_switch_hits_summary (deveria estar revogado)';
  END IF;
END;
$$;
