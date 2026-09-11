
-- VACUUM ANALYZE para compactar espaço e atualizar estatísticas
-- Especialmente importante após: DROP dimensions jsonb + DROP 12 índices + hard-delete 5 produtos
-- Nota: VACUUM não pode ser executado em transação — usar via cron.job_run_details
-- Esta migration registra a intenção; VACUUM será agendado como cron one-shot
SELECT cron.schedule(
  'vacuum-products-post-refactor-20260623',
  '* * * * *',
  'VACUUM ANALYZE public.products;'
);
;
