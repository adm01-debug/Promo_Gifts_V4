-- ============================================================================
-- M9: restaura cron asia-image-uploader (jobid 278) — halt silencioso classe M6.
-- Chamava fn_asia_image_uploader_tick() (REMOVIDA/RENOMEADA) -> 42883 engolido.
-- Funcao real: fn_asia_run_image_cycle(p_limit=20, p_wait_seconds=60) —
--   ciclo de upload de imagens ASIA -> Cloudflare (advisory lock 74108913: seguro).
--   Fila asia_image_import_queue atualmente sem pendencias; reenable e bounded e forward-looking
--   (novos produtos ASIA da ingestao restaurada precisam de upload de imagem).
-- ANTI-REGRESSAO: nao reapontar para fn_asia_image_uploader_tick (inexistente).
-- fix_version = asia_image_uploader_repoint_v1
-- ============================================================================
SELECT cron.alter_job(
  job_id  := 278,
  command := $cmd$SELECT public.fn_cron_safe_run(77::bigint, 'SELECT public.fn_asia_run_image_cycle();', 1160000, 'asia-img-uploader');$cmd$
);
;
