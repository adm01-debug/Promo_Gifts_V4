-- CRÍTICO (Fase 9): restaura o cron PRINCIPAL de ingestão, que havia sido removido.
-- Sem ele, raws ficam 'pending' indefinidamente (900 acumuladas foram encontradas paradas).
DO $$ BEGIN
  PERFORM cron.unschedule('process-pending-products');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'process-pending-products',
  '*/5 * * * *',
  $cron$ SELECT * FROM process_pending_batches(); $cron$
);;
