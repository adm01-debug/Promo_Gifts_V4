-- Rollback: 20261027230000_cleanup_get_edge_function_secret_allowlist.sql
-- Recria get_edge_function_secret com as 3 entradas stale reinseridas.
-- Se 20261027233000 já foi aplicado (XBZ presente na função atual),
-- preserva XBZ_IMAGE_UPLOADER_CRON_SECRET; caso contrário, omite.

DO $$
DECLARE
  _has_xbz boolean;
BEGIN
  SELECT pg_get_functiondef(p.oid) ILIKE '%XBZ_IMAGE_UPLOADER_CRON_SECRET%'
  INTO _has_xbz
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'get_edge_function_secret';

  IF _has_xbz THEN
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION public.get_edge_function_secret(_name text)
      RETURNS text LANGUAGE plpgsql SECURITY DEFINER
      SET search_path = public, vault
      AS $body$
      DECLARE _secret text;
      BEGIN
        IF _name NOT IN (
          'WEBHOOK_DISPATCHER_SECRET','CONNECTIONS_AUTO_TEST_SECRET','CRON_SECRET',
          'HASH_PRODUCT_IMAGES_CRON_SECRET','GENERATE_BLURHASHES_CRON_SECRET',
          'BACKFILL_DIM_CRON_SECRET',
          'WEBHOOK_DISPATCHER_URL','WEBHOOK_SECRET','ASIA_INGESTION_CRON_SECRET',
          'XBZ_IMAGE_UPLOADER_CRON_SECRET'
        ) THEN
          RAISE EXCEPTION 'Nome de secret nao autorizado: %', _name
            USING ERRCODE = 'insufficient_privilege';
        END IF;
        SELECT decrypted_secret INTO _secret FROM vault.decrypted_secrets
        WHERE name = _name LIMIT 1;
        IF _secret IS NULL THEN
          RAISE EXCEPTION 'Secret % nao encontrado no vault', _name
            USING ERRCODE = 'no_data_found';
        END IF;
        RETURN _secret;
      END;
      $body$
    $func$;
  ELSE
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION public.get_edge_function_secret(_name text)
      RETURNS text LANGUAGE plpgsql SECURITY DEFINER
      SET search_path = public, vault
      AS $body$
      DECLARE _secret text;
      BEGIN
        IF _name NOT IN (
          'WEBHOOK_DISPATCHER_SECRET','CONNECTIONS_AUTO_TEST_SECRET','CRON_SECRET',
          'HASH_PRODUCT_IMAGES_CRON_SECRET','GENERATE_BLURHASHES_CRON_SECRET',
          'BACKFILL_DIM_CRON_SECRET',
          'WEBHOOK_DISPATCHER_URL','WEBHOOK_SECRET','ASIA_INGESTION_CRON_SECRET'
        ) THEN
          RAISE EXCEPTION 'Nome de secret nao autorizado: %', _name
            USING ERRCODE = 'insufficient_privilege';
        END IF;
        SELECT decrypted_secret INTO _secret FROM vault.decrypted_secrets
        WHERE name = _name LIMIT 1;
        IF _secret IS NULL THEN
          RAISE EXCEPTION 'Secret % nao encontrado no vault', _name
            USING ERRCODE = 'no_data_found';
        END IF;
        RETURN _secret;
      END;
      $body$
    $func$;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_edge_function_secret(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_edge_function_secret(text) TO service_role;
