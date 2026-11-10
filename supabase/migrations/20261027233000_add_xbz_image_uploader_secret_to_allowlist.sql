-- Migration: 20261027233000_add_xbz_image_uploader_secret_to_allowlist.sql
-- CONTEXTO: Adiciona XBZ_IMAGE_UPLOADER_CRON_SECRET ao allowlist de get_edge_function_secret.
-- PRÉ-REQUISITO: Secret XBZ_IMAGE_UPLOADER_CRON_SECRET deve estar no vault antes de aplicar.
-- Esta migration expande o allowlist de 6 para 7 entradas.
-- Depende de: 20261027230000 (que removeu as 3 entradas stale) ter sido aplicada antes.

-- ── PRÉ-CONDIÇÃO: função existe e XBZ_IMAGE_UPLOADER_CRON_SECRET NÃO está ainda ───────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'XBZ_IMAGE_UPLOADER_CRON_SECRET'
  ) THEN
    RAISE EXCEPTION 'Pré-condição falhou: XBZ_IMAGE_UPLOADER_CRON_SECRET não encontrado no vault';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_edge_function_secret'
  ) THEN
    RAISE EXCEPTION 'Pré-condição falhou: get_edge_function_secret não encontrada';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_edge_function_secret'
      AND pg_get_functiondef(p.oid) ILIKE '%XBZ_IMAGE_UPLOADER_CRON_SECRET%'
  ) THEN
    RAISE EXCEPTION 'Pré-condição falhou: XBZ_IMAGE_UPLOADER_CRON_SECRET já está no allowlist (migration aplicada antes?)';
  END IF;
END;
$$;

-- ── RECRIAR FUNÇÃO COM A NOVA ENTRADA ────────────────────────────────────────
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
    'XBZ_IMAGE_UPLOADER_CRON_SECRET'
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

-- Restaurar grants
REVOKE ALL ON FUNCTION public.get_edge_function_secret(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_edge_function_secret(text) TO service_role;

-- ── PÓS-CONDIÇÃO: nova entrada presente ──────────────────────────────────────
DO $$
DECLARE
  func_def text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO func_def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'get_edge_function_secret';

  IF func_def NOT ILIKE '%XBZ_IMAGE_UPLOADER_CRON_SECRET%' THEN
    RAISE EXCEPTION 'Pós-condição falhou: XBZ_IMAGE_UPLOADER_CRON_SECRET não encontrado no allowlist após migration';
  END IF;
END;
$$;
