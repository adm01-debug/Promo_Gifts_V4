-- Rollback: 20261027233000_add_xbz_image_uploader_secret_to_allowlist.sql
-- Remove XBZ_IMAGE_UPLOADER_CRON_SECRET do allowlist (volta a 6 entradas).
-- ATENÇÃO: aplicar APÓS rollback de 20261027234500 (que desativa o cron).
-- ATENÇÃO: aplicar ANTES do rollback de 20261027230000 se este também for revertido.

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
    'BACKFILL_DIM_CRON_SECRET'
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
