-- ============================================================================
-- M8: restaura cron xbz-site-scrape (jobid 269) — halt silencioso classe M6.
-- Chamava fn_xbz_site_scrape_tick() (REMOVIDA/RENOMEADA) -> fn_cron_safe_run engolia 42883.
-- Funcao real: fn_xbz_site_tick(p_enqueue, p_collect, p_stale_days, p_api_key) —
--   orquestra collect->enqueue->silver->guard->promote do pipeline SITE do XBZ.
--   api_key=NULL e seguro: fn_xbz_site_enqueue resolve 'jina_api_key' do Vault (ou free tier).
-- ANTI-REGRESSAO: nao reapontar para fn_xbz_site_scrape_tick (inexistente).
-- fix_version = xbz_site_scrape_repoint_v1
-- ============================================================================
SELECT cron.alter_job(
  job_id  := 269,
  command := $cmd$SELECT public.fn_cron_safe_run(56::bigint, 'SELECT public.fn_xbz_site_tick(5, 20, 7);', 580000, 'xbz-site-scrape');$cmd$
);
;
