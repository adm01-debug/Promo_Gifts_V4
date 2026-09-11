-- MELHORIA 3 (fix #1): cron 277 chamava fn_xbz_stock_sync() INEXISTENTE → erro engolido por
-- fn_cron_safe_run → no-op disfarçado de "succeeded". A função correta (Bronze→VSS, stock+preço,
-- DEFINER, search_path=public, statement_timeout=120s, sem HTTP externo) é fn_xbz_stock_fast_sync_v3.
-- Dry-run 2026-06-26: success=true, 7435 VSS + 7306 variants, 91s. Reaponta mantendo schedule 15min.
-- fix_version: xbz-stocksync-cron-v3
SELECT cron.alter_job(
  job_id := 277,
  command := $cmd$SELECT public.fn_cron_safe_run(54::bigint, $sql$SELECT public.fn_xbz_stock_fast_sync_v3('d6718a29-e954-4c1b-bd84-03ea24884900'::uuid);$sql$, 880000, 'xbz-stock-sync');$cmd$
);;
