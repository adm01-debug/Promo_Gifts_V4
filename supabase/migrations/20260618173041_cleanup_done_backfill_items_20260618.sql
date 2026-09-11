
-- MELHORIA 5: Remover itens 'done' do backfill_queue
-- Os dados já foram gravados em product_images via trigger trg_sync_backfill_queue
-- Manter 'skipped' para rastreabilidade; remover apenas 'done'
DELETE FROM public.image_backfill_queue
WHERE status = 'done';

-- Confirmar remoção
SELECT status, COUNT(*) AS remaining
FROM public.image_backfill_queue
GROUP BY status;
;
