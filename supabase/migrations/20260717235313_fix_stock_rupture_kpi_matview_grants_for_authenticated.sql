-- Bug pré-existente: mv_stock_rupture_alert, mv_ema_kpi_by_level e vw_rupture_*
-- estavam em 403 para authenticated desde a migration 20260626184039 (revoke_anon)
-- e consolidados pela Phase 5 da 063. Descoberto por teste de stress pós-PR #1731.

DO $$
DECLARE v_vw text;
BEGIN
  -- mv_stock_rupture_alert (usada por useRuptureAlerts, StockRiskHero, VariantStockTable)
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='mv_stock_rupture_alert' AND c.relkind='m')
  THEN
    GRANT SELECT ON public.mv_stock_rupture_alert TO authenticated, service_role;
  ELSE
    RAISE NOTICE '[rupture_fix] mv_stock_rupture_alert ausente — skip';
  END IF;

  -- mv_ema_kpi_by_level (KPI de nível EMA, carregado por StockRiskHero)
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='mv_ema_kpi_by_level' AND c.relkind='m')
  THEN
    GRANT SELECT ON public.mv_ema_kpi_by_level TO authenticated, service_role;
  ELSE
    RAISE NOTICE '[rupture_fix] mv_ema_kpi_by_level ausente — skip';
  END IF;

  -- Wrappers vw_rupture_* com security_invoker=true: grant na view + no dep já resolvido acima
  FOREACH v_vw IN ARRAY ARRAY['vw_rupture_confidence_audit','vw_rupture_gap_purchase',
                              'vw_rupture_live_divergence'] LOOP
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
               WHERE n.nspname='public' AND c.relname=v_vw AND c.relkind='v')
    THEN
      EXECUTE format('GRANT SELECT ON public.%I TO authenticated', v_vw);
    END IF;
  END LOOP;

  -- Confirmar que anon NÃO recebe acesso (dados operacionais internos)
  FOREACH v_vw IN ARRAY ARRAY['mv_stock_rupture_alert','mv_ema_kpi_by_level',
    'vw_rupture_confidence_audit','vw_rupture_gap_purchase','vw_rupture_live_divergence'] LOOP
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
               WHERE n.nspname='public' AND c.relname=v_vw)
    THEN
      EXECUTE format('REVOKE SELECT ON public.%I FROM anon', v_vw);
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';;
