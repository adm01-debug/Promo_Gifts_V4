-- Migration: 20261022100021_fix_cron_hash_product_images.sql
-- Propósito: Redistribui 'hash-product-images' para minuto :04 para evitar
--   colisão de startup com 'dispatcher-failure-alert' e 'sync-is-stockout-universal'
--   (todos disparam em */5 = :00,:05,:10,...,:55).
-- Histórico: fix08 (2026-06-23) mudou para */2; OOB reconciliation (2026-10-13)
--   reverteu para */5. Este fix mantém frequência 5-min mas offset +4 min.
-- Causa raiz: cron.max_running_jobs=32 saturado quando 3+ jobs disparam no mesmo minuto.
-- Impacto: hash de imagem atrasa até 4 minutos — sem impacto no catálogo ao vivo.
-- Aprovação: necessária via db-apply-migration.yml (REGRA #8 / E15).
-- Referência: auditoria-supabase/propostas/P19_cron_failures_remediation.md

BEGIN;

-- Verificação pré-condição
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'hash-product-images') THEN
    RAISE EXCEPTION 'Pré-condição falhou: job hash-product-images não encontrado em cron.job';
  END IF;
END;
$$;

-- Redistribui para :04, :14, :24, :34, :44, :54 (offset +4 min, evita colisão com */5)
SELECT cron.unschedule('hash-product-images');

SELECT cron.schedule(
  'hash-product-images',
  '4,14,24,34,44,54 * * * *',
  $$SELECT net.http_post(
    url := public.get_edge_functions_base_url() || '/functions/v1/hash-product-images',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.get_edge_anon_key(),
      'x-cron-secret', public.get_edge_function_secret('HASH_PRODUCT_IMAGES_CRON_SECRET')
    ),
    body := '{"trigger":"cron"}'::jsonb,
    timeout_milliseconds := 55000
  )$$
);

COMMIT;
