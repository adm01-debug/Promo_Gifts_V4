
-- ═══════════════════════════════════════════════════════════════════════
-- MIGRATION 1/2: archive schema setup + function fixes (pre-table move)
-- Date: 2026-06-15 | cron #33 já removido via cron.unschedule()
-- ═══════════════════════════════════════════════════════════════════════

-- ─── 1. Criar schema archive ──────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS archive;
COMMENT ON SCHEMA archive IS
  'Tabelas depreciadas/arquivadas. Movidas em 2026-06-15. Somente leitura historica.';

GRANT USAGE ON SCHEMA archive TO postgres, service_role;

-- ─── 2. Corrigir typo em purge_old_audit_logs ─────────────────────────
-- Era: DELETE FROM archive.audit_logs (plural — typo)
-- Correto: archive.audit_log (singular, nome real da tabela)
CREATE OR REPLACE FUNCTION public.purge_old_audit_logs()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    retention_days INT := 90;
    row_limit      INT := 100000;
    current_count  INT;
BEGIN
    -- audit_log movida para archive em 2026-06-15; nunca acumulou dados
    DELETE FROM archive.audit_log
     WHERE created_at < now() - (retention_days || ' days')::interval;
    SELECT count(*) INTO current_count FROM archive.audit_log;
    IF current_count > row_limit THEN
        DELETE FROM archive.audit_log
         WHERE id IN (
             SELECT id FROM archive.audit_log ORDER BY created_at ASC
             LIMIT (current_count - row_limit)
         );
    END IF;
END;
$function$;

-- ─── 3. Adicionar 'archive' ao search_path das funções afetadas ────────

-- 3a. media_sync_log — 7 funções ativas que INSERT/SELECT nela
ALTER FUNCTION public.log_image_upload(uuid, character varying, text, text, bigint, character varying)
    SET search_path = 'public', 'archive';

ALTER FUNCTION public.log_video_upload(uuid, character varying, text, text, bigint, character varying)
    SET search_path = 'public', 'archive';

ALTER FUNCTION public.get_cloudflare_stats()
    SET search_path = 'public', 'archive';

ALTER FUNCTION public.update_image_after_sync(uuid, character varying, text, bigint, integer, integer, character varying)
    SET search_path = 'public', 'archive';

ALTER FUNCTION public.update_video_after_sync(uuid, character varying, text, text, text, text, integer, integer, integer)
    SET search_path = 'public', 'archive';

ALTER FUNCTION public.register_cloudflare_image(
    uuid, character varying, text, character varying, uuid, uuid,
    character varying, bigint, integer, integer, character varying,
    boolean, integer, character varying, text)
    SET search_path = 'public', 'archive';

ALTER FUNCTION public.register_cloudflare_video(
    uuid, character varying, text, character varying, character varying,
    text, text, text, character varying, bigint, integer, integer,
    integer, boolean, integer, character varying, character varying, text)
    SET search_path = 'public', 'archive';

-- 3b. execute_role_migration_batch (insere em role_migration_batches/items)
ALTER FUNCTION public.execute_role_migration_batch(text, text, jsonb, boolean)
    SET search_path = 'public', 'archive';

-- 3c. asia_legacy — 3 funções
ALTER FUNCTION public.fn_asia_legacy_dispatch_batch(integer)
    SET search_path = 'public', 'net', 'archive';

ALTER FUNCTION public.fn_asia_legacy_harvest_batch()
    SET search_path = 'public', 'net', 'archive';

ALTER FUNCTION public.fn_asia_legacy_run_cycle(integer)
    SET search_path = 'public', 'net', 'archive';

-- 3d. cf_sm_legacy — 2 funções
ALTER FUNCTION public.fn_cf_collect_sm_legacy_harvest(bigint, bigint)
    SET search_path = 'public', 'net', 'archive';

ALTER FUNCTION public.fn_cf_sm_legacy_insert_batch(jsonb)
    SET search_path = 'public', 'archive';

-- ─── 4. Verificação inline ────────────────────────────────────────────
DO $$
DECLARE
    v_schema_exists BOOLEAN;
    v_fn_sp         TEXT;
BEGIN
    SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name='archive')
      INTO v_schema_exists;
    IF NOT v_schema_exists THEN
        RAISE EXCEPTION 'ASSERT FAIL: schema archive nao foi criado';
    END IF;

    -- Verificar search_path de uma das funções alteradas
    SELECT pg_options_to_table.option_value INTO v_fn_sp
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN LATERAL unnest(p.proconfig) AS cfg ON true
    JOIN LATERAL pg_options_to_table(ARRAY[cfg]) ON pg_options_to_table.option_name = 'search_path'
    WHERE n.nspname = 'public' AND p.proname = 'get_cloudflare_stats';
    
    IF v_fn_sp NOT ILIKE '%archive%' THEN
        RAISE EXCEPTION 'ASSERT FAIL: get_cloudflare_stats search_path sem archive. Got: %', v_fn_sp;
    END IF;

    RAISE NOTICE 'PASS M1: schema archive OK, search_paths atualizados (sample: %)', v_fn_sp;
END $$;
;
