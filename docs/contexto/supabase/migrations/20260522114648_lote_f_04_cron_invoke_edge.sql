-- ============================================================================
-- LOTE F · MIGRATION 4/4 · cron_invoke_edge
-- ⚠️ SENSÍVEL: invoca edge functions via HTTP usando secrets do Vault
-- Pré-requisitos runtime (não validáveis no DDL):
--   - vault.decrypted_secrets deve conter 'edge_anon_key'
--   - vault.decrypted_secrets deve conter o secret p_url_secret_name passado
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cron_invoke_edge(
  p_url_secret_name text, p_body jsonb DEFAULT '{}'::jsonb, p_timeout_ms integer DEFAULT 30000
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_url      text;
  v_anon     text;
  v_request  bigint;
BEGIN
  SELECT decrypted_secret INTO v_url
    FROM vault.decrypted_secrets WHERE name = p_url_secret_name;
  SELECT decrypted_secret INTO v_anon
    FROM vault.decrypted_secrets WHERE name = 'edge_anon_key';

  IF v_url IS NULL THEN
    RAISE EXCEPTION 'Vault secret % not found', p_url_secret_name;
  END IF;
  IF v_anon IS NULL THEN
    RAISE EXCEPTION 'Vault secret edge_anon_key not found';
  END IF;

  SELECT extensions.net_http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_anon
    ),
    body    := p_body,
    timeout_milliseconds := p_timeout_ms
  ) INTO v_request;

  RETURN v_request;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.cron_invoke_edge(text,jsonb,integer) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.cron_invoke_edge(text,jsonb,integer) IS
  'Migrada do Lovable em 2026-05-22 (Lote F). SENSIVEL: invoca edges via HTTP usando vault.decrypted_secrets. Antes do primeiro uso: confirmar secret edge_anon_key no Vault.';
