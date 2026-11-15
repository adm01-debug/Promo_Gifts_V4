-- Rollback: 20261112120300_fix_medallion_health_dev_rpc
-- Remove a RPC dev-gated fn_dev_medallion_health(). As views vw_medallion_coverage e
-- v_pipeline_progress não são tocadas (continuam sem SELECT para authenticated).
-- Depois deste rollback o MedallionPipelineCard volta a ficar em erro até o front ser revertido
-- junto (src/hooks/admin/useMedallionHealth.ts).

DROP FUNCTION IF EXISTS public.fn_dev_medallion_health();
