-- ============================================================================
-- M7: corrige sync_interval_minutes de XBZ e STRICKER.
-- Estavam em 30 (cadencia do FAST-sync), mas o alerta stale_sync usa
-- sync_interval_minutes*4 como threshold sobre last_full_sync_at (full import,
-- cadencia real ~4h) => threshold 4h ~ cadencia => FLAP de SUPPLIER_SYNC_STALE.
-- Correcao: 240 (=> threshold LEAST(GREATEST(240*4,240),1440)=16h, igual ASIA).
-- Elimina o flap; mantem deteccao de stall real (>16h). Coberto em granularidade
-- fina por IMPORT_STALLED (1h) e SILVER_PROMOTE_STALLED (2h).
-- SEGURANCA: sync_interval_minutes e ALERT-ONLY (nenhuma funcao em pg_proc a le; verificado).
-- PROVA (dry-run BEGIN/ROLLBACK): dispara_agora=false, flaparia_se_8h=false, detecta_stall_20h=true.
-- fix_version = supplier_sync_interval_honest_v1
-- ============================================================================
UPDATE public.suppliers
   SET sync_interval_minutes = 240
 WHERE code IN ('XBZ','STRICKER')
   AND sync_interval_minutes IS DISTINCT FROM 240;
;
