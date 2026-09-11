
-- ═══════════════════════════════════════════════════════════════════
-- SECURITY: Revogar EXECUTE de anon em funções analytics internas
-- que expõem dados de estoque, EMA, ruptura, valor de inventário.
--
-- Funções alvo:
--   fn_rupture_quick_stats()               — stock value, gap, anomalias
--   fn_ema_kpi_by_level(boolean)           — KPI de cobertura por nível
--   fn_rupture_anomalia_report(numeric)    — anomalias de velocidade/EMA
--   fn_rupture_by_level(text,int,int,bool) — variantes em ruptura por nível
--   fn_rupture_health_check()              — saúde geral de ruptura
--
-- Evidências:
--   0 cron references, 0 RLS policy references, 0 function body refs
--   NOT in event trigger whitelist → inadvertidamente não incluídas no
--   mass REVOKE de 2026-06-19 (criadas antes do event trigger ou reaprovadas)
--
-- Impacto: apenas anon perde EXECUTE. service_role e authenticated mantêm.
-- Idempotente: REVOKE de grant inexistente é no-op.
--
-- fix_version=2026-06-26_revoke_rupture_kpi_anon
-- ANTI-REGRESSÃO: NÃO reconceder anon EXECUTE nestas funções.
-- ═══════════════════════════════════════════════════════════════════

REVOKE EXECUTE ON FUNCTION public.fn_rupture_quick_stats()                                            FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_ema_kpi_by_level(boolean)                                        FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_rupture_anomalia_report(numeric)                                  FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_rupture_by_level(text, integer, integer, boolean)                 FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_rupture_health_check()                                            FROM anon, PUBLIC;

-- Auto-validação
DO $$
DECLARE v_fn text; v_has_anon boolean;
BEGIN
  FOR v_fn IN VALUES ('fn_rupture_quick_stats'),('fn_ema_kpi_by_level'),('fn_rupture_anomalia_report'),('fn_rupture_by_level'),('fn_rupture_health_check') LOOP
    SELECT EXISTS (
      SELECT 1 FROM pg_proc p2 JOIN pg_namespace n2 ON n2.oid=p2.pronamespace
      CROSS JOIN LATERAL aclexplode(COALESCE(p2.proacl,acldefault('f',p2.proowner))) ace
      WHERE n2.nspname='public' AND p2.proname=v_fn
        AND ace.privilege_type='EXECUTE' AND ace.grantee IN (0,(SELECT oid FROM pg_roles WHERE rolname='anon'))
    ) INTO v_has_anon;
    IF v_has_anon THEN
      RAISE EXCEPTION 'FALHA: % ainda tem anon EXECUTE', v_fn;
    END IF;
  END LOOP;
  RAISE NOTICE 'OK: 5 rupture/KPI fns sem anon EXECUTE';
END $$;

NOTIFY pgrst, 'reload schema';
;
