
-- =============================================================
-- FIX #02: Redistribuição dos 5 jobs */5 SQL pesados
-- ANTES: todos em 0,5,10,15,20,25,30,35,40,45,50,55 (colisão!)
-- DEPOIS: cada um em slot diferente, +1min de offset
-- =============================================================

-- JOB 115: sync-is-stockout-universal → fica em slot 0 (âncora)
SELECT cron.unschedule('sync-is-stockout-universal');
SELECT cron.schedule(
  'sync-is-stockout-universal',
  '0,5,10,15,20,25,30,35,40,45,50,55 * * * *',
  'SELECT public.fn_cron_safe_run(115::bigint, ''SELECT public.fn_sync_is_stockout_all();'', 44000, ''sync-is-stockout'');'
);

-- JOB 23: auto-block-offenders → slot 1 (+1 min)
SELECT cron.unschedule('auto-block-offenders');
SELECT cron.schedule(
  'auto-block-offenders',
  '1,6,11,16,21,26,31,36,41,46,51,56 * * * *',
  'SELECT public.fn_cron_safe_run(23::bigint, ''SELECT public.auto_block_extreme_offenders();'', 44000, ''auto-block-offenders'');'
);

-- JOB 80: sm-variant-coherence-guard → slot 2 (+2 min)
SELECT cron.unschedule('sm-variant-coherence-guard');
SELECT cron.schedule(
  'sm-variant-coherence-guard',
  '2,7,12,17,22,27,32,37,42,47,52,57 * * * *',
  'SELECT public.fn_cron_safe_run(80::bigint, ''SELECT public.fn_sm_variant_coherence_guard();'', 44000, ''sm-variant-guard'');'
);

-- JOB 81: sm-stock-guard → slot 3 (+3 min)
SELECT cron.unschedule('sm-stock-guard');
SELECT cron.schedule(
  'sm-stock-guard',
  '3,8,13,18,23,28,33,38,43,48,53,58 * * * *',
  'SELECT public.fn_cron_safe_run(81::bigint, ''SELECT public.fn_sm_stock_guard();'', 44000, ''sm-stock-guard'');'
);

-- JOB 166: fantasmas-deactivate-guard → slot 4 (+4 min)
SELECT cron.unschedule('fantasmas-deactivate-guard');
SELECT cron.schedule(
  'fantasmas-deactivate-guard',
  '4,9,14,19,24,29,34,39,44,49,54,59 * * * *',
  $cmd$
  SELECT public.fn_cron_safe_run(166::bigint, $sql$
    UPDATE products SET is_active = false, updated_at = now()
    WHERE is_active = true AND supplier_reference IS NULL AND sku IS NULL AND supplier_id IS NOT NULL;
    UPDATE products SET is_active = false, updated_at = now()
    WHERE 'active' = ANY(COALESCE(locked_fields, '{}')) AND is_active = true;
    UPDATE products SET is_active = true, updated_at = now()
    WHERE sku LIKE 'XBZ-MANUAL-%' AND is_active = false AND is_deleted = false;
  $sql$, 44000, 'fantasmas-guard');
  $cmd$
);
;
