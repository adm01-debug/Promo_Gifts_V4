
-- PASSO 1: Renomeia tabela
ALTER TABLE public.ai_insights_cache
  RENAME TO dashboard_insights_cache;

-- PASSO 2: Renomeia indexes
ALTER INDEX IF EXISTS public.ai_insights_cache_pkey
  RENAME TO dashboard_insights_cache_pkey;

ALTER INDEX IF EXISTS public.ux_ai_insights_cache_user_fn_key
  RENAME TO ux_dashboard_insights_cache_user_fn_key;

ALTER INDEX IF EXISTS public.idx_ai_insights_cache_expires_at
  RENAME TO idx_dashboard_insights_cache_expires_at;

-- PASSO 3: Atualiza as 3 funções
DO $$
DECLARE v_def text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='fn_generate_market_insights_cache';
  v_def := replace(v_def, 'ai_insights_cache', 'dashboard_insights_cache');
  EXECUTE v_def;

  SELECT pg_get_functiondef(p.oid) INTO v_def
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='fn_generate_trends_insights';
  v_def := replace(v_def, 'ai_insights_cache', 'dashboard_insights_cache');
  EXECUTE v_def;

  SELECT pg_get_functiondef(p.oid) INTO v_def
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='fn_run_smoke_tests';
  v_def := replace(v_def, 'ai_insights_cache', 'dashboard_insights_cache');
  EXECUTE v_def;
END $$;
;
