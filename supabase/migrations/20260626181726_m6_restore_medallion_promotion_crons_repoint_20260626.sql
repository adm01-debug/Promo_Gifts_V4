-- ============================================================================
-- M6: Restaura os crons de promoção do medallion que apontavam para funções
--     RENOMEADAS/REMOVIDAS (halt silencioso desde ~2026-06-23 18:36).
-- ----------------------------------------------------------------------------
-- Causa-raiz comprovada:
--   * fn_medallion_promote_tick()        -> RENOMEADA p/ fn_pipeline_promote_tick(integer)
--   * fn_process_pending_products()      -> RENOMEADA p/ process_pending_batches()
--   * fn_pipeline_classify_pending_products(integer) -> REMOVIDA (classificacao virou trigger-driven)
--   fn_cron_safe_run capturava o erro "function does not exist" (SQLSTATE 42883) e
--   retornava normalmente => cron "succeeded/1 row" mascarando o halt.
--   Sintomas: Bronze 98 pending (desde 23/06), 2 pais + 8 variantes Silver orfaos,
--   22 produtos NOVOS travados, gold_last_create congelado em 2026-06-20.
-- Prova (dry-run BEGIN/ROLLBACK, esta sessao):
--   process_pending_batches()       => Bronze 98->0, orfaos 2/8->0, +22 produtos, erros visiveis tratados
--   fn_pipeline_promote_tick(300)   => erros=0, +22 produtos, 35 pais / 100 variantes promovidas
-- fix_version = medallion_cron_repoint_v1
-- ANTI-REGRESSAO (bot Lovable): se estes jobs voltarem a apontar p/ fn_medallion_promote_tick
--   ou fn_process_pending_products, o halt silencioso retorna. Manter os nomes abaixo.
-- ============================================================================

-- 275 medallion-promote-tick -> canonico fn_pipeline_promote_tick
--   (advisory xact lock proprio + respeita pipeline_control.promote_tick + grava pipeline_run_log)
SELECT cron.alter_job(
  job_id  := 275,
  command := $cmd$SELECT public.fn_cron_safe_run(59::bigint, 'SELECT public.fn_pipeline_promote_tick(300);', 580000, 'medallion-promote');$cmd$
);

-- 273 process-pending-products -> process_pending_batches
--   (standardize+promote por fornecedor com auto_sync + Fase 9: promove variantes orfas que o tick nao cobre)
SELECT cron.alter_job(
  job_id  := 273,
  command := $cmd$SELECT public.fn_cron_safe_run(88::bigint, 'SELECT public.process_pending_batches();', 290000, 'process-pending');$cmd$
);

-- 274 pipeline-classify-categories -> alvo removido; classificacao agora e trigger-driven em products
--   (trg_auto_classify_product / trg_classify_packing / trg_auto_classify_kit). Desabilitar como OBSOLETO.
SELECT cron.alter_job(job_id := 274, active := false);
;
