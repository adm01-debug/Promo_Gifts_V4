-- Migration: 20261027220000_deactivate_xbz_image_uploader_cron.sql
-- Rollback: supabase/rollbacks/20261027220000_rollback.sql
-- PROBLEMA: cron xbz-image-uploader chama get_edge_function_secret('XBZ_IMAGE_UPLOADER_CRON_SECRET')
-- que não está no allowlist da função → EXCEPTION a cada 10 min (6x/hora).
-- fn_cron_safe_run captura a exceção silenciosamente → cron aparece como "succeeded" no
-- cron.job_run_details mas a função nunca é chamada.
-- Adicionalmente: a edge function xbz-image-uploader não existe no repo nem entre as
-- 109 funções deployadas (verificado 2026-10-27 via list_edge_functions).
-- FIX: desativar o cron até que a função e o secret sejam criados e configurados.
-- Reativação: cron.alter_job(job_id, active := true) após:
--   1. Criar supabase/functions/xbz-image-uploader/index.ts com authorizeCron
--   2. Adicionar XBZ_IMAGE_UPLOADER_CRON_SECRET ao vault
--   3. Adicionar XBZ_IMAGE_UPLOADER_CRON_SECRET ao allowlist de get_edge_function_secret
--   4. Deployar via deploy-edge-functions.yml

-- PRÉ-CONDIÇÃO: job existe e está ativo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'xbz-image-uploader' AND active = true
  ) THEN
    RAISE EXCEPTION 'Pré-condição falhou: xbz-image-uploader não encontrado ou já está inativo';
  END IF;
END;
$$;

SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'xbz-image-uploader'),
  active := false
);

-- PÓS-CONDIÇÃO: job agora inativo
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'xbz-image-uploader' AND active = true
  ) THEN
    RAISE EXCEPTION 'Pós-condição falhou: xbz-image-uploader ainda está ativo após alter_job';
  END IF;
END;
$$;
