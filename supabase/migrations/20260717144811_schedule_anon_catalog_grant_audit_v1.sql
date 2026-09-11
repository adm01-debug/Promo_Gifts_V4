-- ============================================================================
-- fix_version: 20260717_schedule_anon_catalog_grant_audit_v1
-- Auditoria automática do read-path anônimo (detecta regressão de bot/sweep).
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.anon_catalog_grant_audit_log (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  checked_at      timestamptz NOT NULL DEFAULT now(),
  violation_count int         NOT NULL,
  violations      jsonb
);
ALTER TABLE public.anon_catalog_grant_audit_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.fn_anon_catalog_grant_audit_run()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE v jsonb; c int;
BEGIN
  SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb), count(*) INTO v, c
  FROM public.fn_verify_anon_catalog_grants() t;
  INSERT INTO public.anon_catalog_grant_audit_log(violation_count, violations)
  VALUES (c, CASE WHEN c > 0 THEN v ELSE NULL END);
  RETURN c;
END $fn$;

-- Agenda a cada 6h (remove agendamento anterior de mesmo nome se existir)
DO $sched$
BEGIN
  PERFORM cron.unschedule('anon-catalog-grant-audit-6h')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='anon-catalog-grant-audit-6h');
  PERFORM cron.schedule('anon-catalog-grant-audit-6h', '0 */6 * * *',
                        'SELECT public.fn_anon_catalog_grant_audit_run()');
END $sched$;;
