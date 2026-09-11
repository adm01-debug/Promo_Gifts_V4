
-- MELHORIA 12: Liberar 9 ghost locks em ai_enrichment_queue (processing há >1 semana)
-- Reset para pending: worker tentará de novo na próxima rodada

UPDATE public.ai_enrichment_queue
SET
  status         = 'pending',
  locked_at      = NULL,
  locked_by      = NULL,
  last_error     = 'Ghost lock detectado e liberado automaticamente em 2026-06-23',
  updated_at     = now()
WHERE status = 'processing'
  AND locked_at < now() - interval '1 hour';

-- Também: marcar done+processed items antigos (>30 dias) para limpeza eventual
-- (não dropar agora — aguardar cron de cleanup existente)
;
