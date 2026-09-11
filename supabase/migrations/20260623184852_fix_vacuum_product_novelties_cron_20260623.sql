-- =============================================================================
-- FIX: cron vacuum-product-novelties usava VACUUM multi-statement dentro de
-- fn_cron_safe_run — VACUUM não pode rodar dentro de transação.
-- Bug detectado em auditoria Round 5 (2026-06-23).
-- Solução: remover cron com fn_cron_safe_run e criar 2 crons separados,
-- cada um com VACUUM standalone (sem wrapper transacional).
-- =============================================================================

-- Remover cron problemático
SELECT cron.unschedule(270);

-- Recriar como 2 crons standalone (VACUUM fora de transação)
SELECT cron.schedule(
  'vacuum-products-weekly',
  '3 3 * * 0',
  'VACUUM ANALYZE public.products'
);

SELECT cron.schedule(
  'vacuum-product-variants-weekly',
  '8 3 * * 0',
  'VACUUM ANALYZE public.product_variants'
);
;
