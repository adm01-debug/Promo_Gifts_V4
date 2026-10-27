-- Migration: 20261027230000_cleanup_get_edge_function_secret_allowlist.sql
-- CONTEXTO: get_edge_function_secret tem 3 entradas stale no allowlist:
--   WEBHOOK_DISPATCHER_URL — não existe no vault, nenhum cron referencia
--   WEBHOOK_SECRET         — não existe no vault, nenhum cron referencia
--   ASIA_INGESTION_CRON_SECRET — não existe no vault, nenhum cron referencia
-- Manter entradas inatingíveis (sem vault entry) no allowlist é ruído que
-- pode confundir diagnósticos futuros. Remover mantém o allowlist como SSOT
-- do que realmente pode ser acessado.
-- Evidência: auditoria 2026-10-27 docs/db/PGMQ_AND_SECRETS_AUDIT_2026-10-27.md
-- Rollback: recriar a função com as 3 entradas reincluídas (abaixo):
--   'WEBHOOK_DISPATCHER_URL', 'WEBHOOK_SECRET', 'ASIA_INGESTION_CRON_SECRET'

-- ── PRÉ-CONDIÇÃO: função existe e ainda contém as entradas stale ──────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_edge_function_secret'
      AND pg_get_functiondef(p.oid) ILIKE '%WEBHOOK_DISPATCHER_URL%'
  ) THEN
    RAISE EXCEPTION 'Pré-condição falhou: get_edge_function_secret não encontrada '
      'ou WEBHOOK_DISPATCHER_URL já não está no allowlist (migration aplicada antes?)';
  END IF;
END;
$$;

-- ── RECRIAR FUNÇÃO SEM AS ENTRADAS STALE ─────────────────────────────────────
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

-- Restaurar grants (CREATE OR REPLACE preserva mas explicitamos por segurança)
REVOKE ALL ON FUNCTION public.get_edge_function_secret(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_edge_function_secret(text) TO service_role;

-- ── PÓS-CONDIÇÃO: entradas stale removidas ───────────────────────────────────
DO $$
DECLARE
  func_def text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO func_def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'get_edge_function_secret';

  IF func_def ILIKE '%WEBHOOK_DISPATCHER_URL%' THEN
    RAISE EXCEPTION 'Pós-condição falhou: WEBHOOK_DISPATCHER_URL ainda presente';
  END IF;
  IF func_def ILIKE '%WEBHOOK_SECRET%' AND func_def NOT ILIKE '%WEBHOOK_DISPATCHER_SECRET%' THEN
    RAISE EXCEPTION 'Pós-condição falhou: WEBHOOK_SECRET ainda presente';
  END IF;
  IF func_def ILIKE '%ASIA_INGESTION_CRON_SECRET%' THEN
    RAISE EXCEPTION 'Pós-condição falhou: ASIA_INGESTION_CRON_SECRET ainda presente';
  END IF;
END;
$$;
