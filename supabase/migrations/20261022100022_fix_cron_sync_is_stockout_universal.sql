-- Migration: 20261022100022_fix_cron_sync_is_stockout_universal.sql
-- Propósito: Reduz frequência de 'sync-is-stockout-universal' de cada 5 min para
--   cada 10 min para aliviar contention de slots no pg_cron.
--   Job dispara em 0,5,10,...,55 (=*/5) — exatamente igual a dispatcher-failure-alert
--   e hash-product-images. As três colisões são a principal causa de startup timeout.
-- Causa raiz: cron.max_running_jobs=32 saturado quando 3+ jobs disparam no mesmo minuto.
-- Custo: latência máxima de atualização de is_stockout sobe de 5→10 min.
--   Aceitável para catálogo B2B com atualizações de estoque em batch.
-- Aprovação: necessária via db-apply-migration.yml (REGRA #8 / E15).
-- Referência: auditoria-supabase/propostas/P19_cron_failures_remediation.md

-- Verificação pré-condição
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-is-stockout-universal') THEN
    RAISE EXCEPTION 'Pré-condição falhou: job sync-is-stockout-universal não encontrado em cron.job';
  END IF;
END;
$$;

-- Reduz de 12x/hora (a cada 5 min) para 6x/hora (a cada 10 min), nos minutos :00,:10,:20,:30,:40,:50
-- Isso elimina a colisão com dispatcher-failure-alert e hash-product-images nos minutos :05,:15,:25,:35,:45,:55
SELECT cron.unschedule('sync-is-stockout-universal');

SELECT cron.schedule(
  'sync-is-stockout-universal',
  '0,10,20,30,40,50 * * * *',
  'SELECT public.fn_cron_safe_run(115::bigint, ''SELECT public.fn_sync_is_stockout_all();'', 44000, ''sync-is-stockout'');'
);
