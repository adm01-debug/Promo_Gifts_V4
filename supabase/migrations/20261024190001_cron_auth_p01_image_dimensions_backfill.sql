-- Migration: 20261024190001_cron_auth_p01_image_dimensions_backfill.sql
-- FASE B — P01: Adicionar autenticação ao job image-dimensions-backfill (CRÍTICO)
-- Achado: A-C01 (Seção 2 — Cron Jobs sem autenticação)
-- Aprovado pelo PO em 2026-10-24 (FASE B — JÁ LIBERADOS)
-- Referência: auditoria-supabase/propostas/P01_cron_auth_headers.sql
-- Rollback: SELECT cron.alter_job(job_id := 235, command := $R$SELECT net.http_post(url := 'https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/run-script', body := '{"script":"image-dimensions-worker"}'::jsonb)$R$);
--
-- Contexto: job image-dimensions-backfill (jobid=235) chama /functions/v1/run-script
-- via net.http_post sem header de autenticação e com URL hardcoded.
-- Esta migration adiciona x-cron-secret (lido do Vault via get_edge_function_secret)
-- e substitui a URL hardcoded por public.get_edge_functions_base_url() —
-- padrão já usado por outros jobs (ex: backfill-image-dimensions, jobid=222).
-- Nota: a edge function run-script não está deployada neste momento;
-- a autenticação entrará em vigor ao deploy.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobid = 235 AND jobname = 'image-dimensions-backfill'
  ) THEN
    RAISE EXCEPTION 'Pré-condição falhou: cron.job jobid=235 (image-dimensions-backfill) não encontrado — verificar jobid atual com: SELECT jobid, jobname FROM cron.job WHERE jobname = ''image-dimensions-backfill''';
  END IF;
END;
$$;

SELECT cron.alter_job(
  job_id := 235,
  command := $CMD$
SELECT net.http_post(
    url := public.get_edge_functions_base_url() || '/functions/v1/run-script',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', public.get_edge_function_secret('CRON_SECRET')
    ),
    body := '{"script":"image-dimensions-worker"}'::jsonb,
    timeout_milliseconds := 55000)
$CMD$
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobid = 235
      AND command ILIKE '%CRON_SECRET%'
      AND command ILIKE '%x-cron-secret%'
  ) THEN
    RAISE EXCEPTION 'Pós-condição falhou: cron.job jobid=235 não tem x-cron-secret no command após alter_job';
  END IF;
END;
$$;
