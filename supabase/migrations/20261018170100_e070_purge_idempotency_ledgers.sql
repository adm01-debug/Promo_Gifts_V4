-- P200-E070 (2026-10-18): agendar purga dos ledgers de idempotência.
-- kit_save_requests, kit_quote_requests e magazine_duplicate_requests crescem sem purga.
-- Padrão: registros com mais de 30 dias são removidos em janela de baixa utilização.
--
-- Rollback: SELECT cron.unschedule('purge-kit-save-requests');
--           SELECT cron.unschedule('purge-kit-quote-requests');
--           SELECT cron.unschedule('purge-magazine-duplicate-requests');

SELECT cron.schedule(
  'purge-kit-save-requests',
  '17 3 * * 0',  -- domingos às 03:17 UTC
  $$
    DELETE FROM public.kit_save_requests
    WHERE created_at < now() - interval '30 days';
  $$
);

SELECT cron.schedule(
  'purge-kit-quote-requests',
  '23 3 * * 0',  -- domingos às 03:23 UTC
  $$
    DELETE FROM public.kit_quote_requests
    WHERE created_at < now() - interval '30 days';
  $$
);

SELECT cron.schedule(
  'purge-magazine-duplicate-requests',
  '31 3 * * 0',  -- domingos às 03:31 UTC
  $$
    DELETE FROM public.magazine_duplicate_requests
    WHERE created_at < now() - interval '30 days';
  $$
);
