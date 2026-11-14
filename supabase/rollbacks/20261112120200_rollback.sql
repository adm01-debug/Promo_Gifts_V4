-- Rollback: 20261112120200_fix_kill_switch_obs_grant_summary_view.sql
-- Volta ao estado de 20260716192234 (só service_role lê a view). Depois disto o
-- painel /admin/observabilidade perde o resumo de hits (o front segue mostrando os switches).

REVOKE SELECT ON public.v_kill_switch_hits_summary FROM authenticated;

COMMENT ON VIEW public.v_kill_switch_hits_summary IS
'Resumo de kill_switch_hits. SECURITY INVOKER: respeita RLS do caller.';
