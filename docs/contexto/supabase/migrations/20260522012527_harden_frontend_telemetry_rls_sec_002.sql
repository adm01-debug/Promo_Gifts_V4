-- SEC-002 — Harden RLS on public.frontend_telemetry
-- Source: auditoria back-end sênior 2026-05-22.
-- Aplicação programada após merge do PR #64.

BEGIN;

DROP POLICY IF EXISTS frontend_telemetry_insert_anon ON public.frontend_telemetry;
DROP POLICY IF EXISTS frontend_telemetry_insert_authenticated ON public.frontend_telemetry;

CREATE POLICY frontend_telemetry_insert_anon
  ON public.frontend_telemetry
  FOR INSERT
  TO anon
  WITH CHECK (
    user_id IS NULL
    AND length(coalesce(event_type, '')) BETWEEN 1 AND 64
    AND length(coalesce(name,       '')) BETWEEN 1 AND 256
    AND length(coalesce(url,        '')) <= 2048
    AND length(coalesce(user_agent, '')) <= 1024
    AND length(coalesce(session_id, '')) <= 128
    AND length(coalesce(metadata::text, '')) <= 8192
  );

CREATE POLICY frontend_telemetry_insert_authenticated
  ON public.frontend_telemetry
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (user_id IS NULL OR user_id = (select auth.uid()))
    AND length(coalesce(event_type, '')) BETWEEN 1 AND 64
    AND length(coalesce(name,       '')) BETWEEN 1 AND 256
    AND length(coalesce(url,        '')) <= 2048
    AND length(coalesce(user_agent, '')) <= 1024
    AND length(coalesce(session_id, '')) <= 128
    AND length(coalesce(metadata::text, '')) <= 8192
  );

ALTER TABLE public.frontend_telemetry
  DROP CONSTRAINT IF EXISTS frontend_telemetry_size_caps_check;

ALTER TABLE public.frontend_telemetry
  ADD CONSTRAINT frontend_telemetry_size_caps_check
  CHECK (
    length(coalesce(event_type, '')) BETWEEN 1 AND 64
    AND length(coalesce(name,       '')) BETWEEN 1 AND 256
    AND length(coalesce(url,        '')) <= 2048
    AND length(coalesce(user_agent, '')) <= 1024
    AND length(coalesce(session_id, '')) <= 128
    AND length(coalesce(metadata::text, '')) <= 8192
  );

COMMENT ON POLICY frontend_telemetry_insert_anon ON public.frontend_telemetry IS
  'SEC-002 hardening (2026-05-22): exige user_id IS NULL para anon + caps de tamanho. Substitui WITH CHECK (true) anterior.';

COMMENT ON POLICY frontend_telemetry_insert_authenticated ON public.frontend_telemetry IS
  'SEC-002 hardening (2026-05-22): exige user_id = auth.uid() (ou NULL) + caps. Substitui WITH CHECK (true) anterior.';

COMMENT ON CONSTRAINT frontend_telemetry_size_caps_check ON public.frontend_telemetry IS
  'SEC-002 defesa em profundidade — caps de tamanho não dependem da policy ativa.';

COMMIT;
