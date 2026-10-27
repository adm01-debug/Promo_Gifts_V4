-- Migration: 20261027250000_reactivate_xbz_image_uploader_cron.sql
-- CONTEXTO: Reativa o cron 'xbz-image-uploader' (active := true).
-- PRÉ-REQUISITO: XBZ_IMAGE_UPLOADER_CRON_SECRET deve estar no vault E
--   a edge function xbz-image-uploader deve estar deployada antes de aplicar.
-- Depende de: 20261027220000 (que desativou o job) ter sido aplicada antes.

-- ── PRÉ-CONDIÇÃO: job existe e está inativo ────────────────────────────────
DO $$
DECLARE
  _job_id bigint;
  _active boolean;
BEGIN
  SELECT jobid, active
    INTO _job_id, _active
    FROM cron.job
   WHERE jobname = 'xbz-image-uploader'
   LIMIT 1;

  IF _job_id IS NULL THEN
    RAISE EXCEPTION 'Pré-condição falhou: cron job xbz-image-uploader não encontrado';
  END IF;

  IF _active IS TRUE THEN
    RAISE EXCEPTION 'Pré-condição falhou: cron job xbz-image-uploader já está ativo (active = true). Migration aplicada antes?';
  END IF;
END;
$$;

-- ── REATIVAR JOB ──────────────────────────────────────────────────────────
SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'xbz-image-uploader' LIMIT 1),
  active := true
);

-- ── PÓS-CONDIÇÃO: job ativo ────────────────────────────────────────────────
DO $$
DECLARE
  _active boolean;
BEGIN
  SELECT active INTO _active
    FROM cron.job
   WHERE jobname = 'xbz-image-uploader'
   LIMIT 1;

  IF _active IS NOT TRUE THEN
    RAISE EXCEPTION 'Pós-condição falhou: cron job xbz-image-uploader não está ativo após migration';
  END IF;
END;
$$;
