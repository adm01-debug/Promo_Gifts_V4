-- Rollback: 20261027230000_cleanup_get_edge_function_secret_allowlist.sql
-- Recria get_edge_function_secret com as 3 entradas stale reincluídas:
--   WEBHOOK_DISPATCHER_URL, WEBHOOK_SECRET, ASIA_INGESTION_CRON_SECRET
-- ATENÇÃO: aplicar ANTES do rollback de 20261027233000 se este também for revertido.

CREATE OR REPLACE FUNCTION public.get_edge_function_secret(_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  _secret text;
BEGIN
  IF _name NOT IN (
    'WEBHOOK_DISPATCHER_SECRET',
    'CONNECTIONS_AUTO_TEST_SECRET',
    'CRON_SECRET',
    'HASH_PRODUCT_IMAGES_CRON_SECRET',
    'GENERATE_BLURHASHES_CRON_SECRET',
    'BACKFILL_DIM_CRON_SECRET',
    'WEBHOOK_DISPATCHER_URL',
    'WEBHOOK_SECRET',
    'ASIA_INGESTION_CRON_SECRET'
  ) THEN
    RAISE EXCEPTION 'Nome de secret nao autorizado: %', _name
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT decrypted_secret INTO _secret
  FROM vault.decrypted_secrets
  WHERE name = _name
  LIMIT 1;

  IF _secret IS NULL THEN
    RAISE EXCEPTION 'Secret % nao encontrado no vault', _name
      USING ERRCODE = 'no_data_found';
  END IF;

  RETURN _secret;
END;
$$;

REVOKE ALL ON FUNCTION public.get_edge_function_secret(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_edge_function_secret(text) TO service_role;
