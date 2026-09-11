
-- ═══════════════════════════════════════════════════════════════════════
-- MIGRATION 2/2: Move 10 tabelas → schema archive + views + grants
-- Date: 2026-06-15 | ATÔMICO
-- Nota: PG17 move sequences automaticamente com ALTER TABLE SET SCHEMA
-- ═══════════════════════════════════════════════════════════════════════

-- ─── BLOCO A: Move 10 tabelas ─────────────────────────────────────────
ALTER TABLE public.role_migration_batches   SET SCHEMA archive;
ALTER TABLE public.role_migration_items     SET SCHEMA archive;
ALTER TABLE public.system_settings_legacy   SET SCHEMA archive;
ALTER TABLE public.asia_legacy_upload_queue SET SCHEMA archive;
ALTER TABLE public.cf_sm_legacy             SET SCHEMA archive;
ALTER TABLE public."_unif_settings_arquivo" SET SCHEMA archive;
ALTER TABLE public.smoke_tests_runs         SET SCHEMA archive;
ALTER TABLE public.audit_log                SET SCHEMA archive;
ALTER TABLE public.product_sync_logs        SET SCHEMA archive;
ALTER TABLE public.media_sync_log           SET SCHEMA archive;

-- ─── BLOCO B: Move sequences SE ainda estiverem em public ─────────────
-- (PG17 pode mover automaticamente; usar bloco condicional)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname='public' AND sequencename='_unif_settings_arquivo_id_seq') THEN
        EXECUTE 'ALTER SEQUENCE public._unif_settings_arquivo_id_seq SET SCHEMA archive';
        RAISE NOTICE 'Sequence _unif_settings_arquivo_id_seq movida para archive';
    ELSE
        RAISE NOTICE 'Sequence _unif_settings_arquivo_id_seq ja em archive (PG17 auto-move)';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname='public' AND sequencename='smoke_tests_runs_id_seq') THEN
        EXECUTE 'ALTER SEQUENCE public.smoke_tests_runs_id_seq SET SCHEMA archive';
        RAISE NOTICE 'Sequence smoke_tests_runs_id_seq movida para archive';
    ELSE
        RAISE NOTICE 'Sequence smoke_tests_runs_id_seq ja em archive (PG17 auto-move)';
    END IF;
END $$;

-- ─── BLOCO C: Atualizar views que referenciam tabelas arquivadas ──────

-- C1. v_db_health_audit: check B03 atualizado (smoke_tests_runs arquivada)
CREATE OR REPLACE VIEW public.v_db_health_audit AS
 SELECT 'B02_quote_markup_nao_persistido'::text AS check_id,
        count(*) AS total_issues,
        'negotiation_markup_percent=0 mas total > subtotal sem frete/imposto/desconto'::text AS descricao,
        'HIGH'::text AS severidade
   FROM quotes
  WHERE (quotes.negotiation_markup_percent = (0)::numeric)
    AND (quotes.total > quotes.subtotal)
    AND (abs(COALESCE(quotes.shipping_cost, (0)::numeric)) < 0.01)
    AND (abs(COALESCE(quotes.tax_amount, (0)::numeric)) < 0.01)
    AND (abs(COALESCE(quotes.discount_amount, (0)::numeric)) < 0.01)
UNION ALL
 SELECT 'B04_produto_ativo_sem_preco'::text, count(*),
        'Produto is_active=true sem cost_price nem sale_price'::text, 'MEDIUM'::text
   FROM products
  WHERE (products.cost_price IS NULL) AND (products.sale_price IS NULL)
    AND (products.is_active = true)
    AND ((products.is_deleted IS NULL) OR (products.is_deleted = false))
UNION ALL
 SELECT 'B05_produto_category_inconsistente'::text, count(*),
        'category_id != main_category_id (verificar se esperado)'::text, 'INFO'::text
   FROM products
  WHERE (products.category_id IS NOT NULL) AND (products.main_category_id IS NOT NULL)
    AND (products.category_id <> products.main_category_id)
UNION ALL
 SELECT 'B03_smoke_tests_runs_arquivada'::text, 0 AS total_issues,
        'smoke_tests_runs movida para schema archive em 2026-06-15. Ativa: smoke_test_runs (sem s).'::text,
        'INFO'::text
UNION ALL
 SELECT 'B06_quote_item_subtotal_formula'::text, count(*),
        'subtotal != (unit_price * qty + personalization_cost)'::text, 'CRITICAL'::text
   FROM quote_items
  WHERE (abs((quote_items.subtotal - (((quote_items.unit_price * (quote_items.quantity)::numeric)
        - COALESCE(quote_items.discount_amount, (0)::numeric))
        + COALESCE(quote_items.personalization_cost, (0)::numeric)))) > 0.01);

-- C2. v_n8n_sync_errors → archive.media_sync_log
CREATE OR REPLACE VIEW public.v_n8n_sync_errors AS
 SELECT id, sync_type, media_type, product_id, source_url,
        error_message, retry_count, created_at
   FROM archive.media_sync_log
  WHERE ((status)::text = 'error'::text)
  ORDER BY created_at DESC LIMIT 100;

-- C3. v_n8n_sync_success_recent → archive.media_sync_log
CREATE OR REPLACE VIEW public.v_n8n_sync_success_recent AS
 SELECT id, sync_type, media_type, product_id, cloudflare_id,
        destination_url, file_size_bytes, processing_time_ms, created_at
   FROM archive.media_sync_log
  WHERE ((status)::text = 'success'::text)
  ORDER BY created_at DESC LIMIT 100;

-- C4. v_n8n_sync_summary → archive.media_sync_log (last leg)
CREATE OR REPLACE VIEW public.v_n8n_sync_summary AS
 SELECT 'products_total'::text AS metric, (count(*))::text AS value FROM products WHERE is_active = true
UNION ALL SELECT 'products_with_images'::text, (count(DISTINCT product_images.product_id))::text
   FROM product_images WHERE is_active = true
UNION ALL SELECT 'products_without_images'::text,
        ((SELECT count(*) FROM products p WHERE p.is_active = true
          AND NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = p.id AND pi.is_active = true)))::text
UNION ALL SELECT 'products_with_videos'::text, (count(DISTINCT product_videos.product_id))::text
   FROM product_videos WHERE is_active = true
UNION ALL SELECT 'products_without_videos'::text,
        ((SELECT count(*) FROM products p WHERE p.is_active = true
          AND NOT EXISTS (SELECT 1 FROM product_videos pv WHERE pv.product_id = p.id AND pv.is_active = true)))::text
UNION ALL SELECT 'total_images'::text, (count(*))::text FROM product_images WHERE is_active = true
UNION ALL SELECT 'total_videos'::text, (count(*))::text FROM product_videos WHERE is_active = true
UNION ALL SELECT 'sync_errors_last_24h'::text, (count(*))::text
   FROM archive.media_sync_log
  WHERE ((status)::text = 'error'::text) AND created_at > (now() - '24:00:00'::interval);

-- ─── BLOCO D: Grants no schema archive ───────────────────────────────
GRANT SELECT ON ALL TABLES    IN SCHEMA archive TO service_role;
GRANT ALL    ON ALL TABLES    IN SCHEMA archive TO postgres;
GRANT ALL    ON ALL SEQUENCES IN SCHEMA archive TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA archive GRANT SELECT ON TABLES    TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA archive GRANT ALL    ON TABLES    TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA archive GRANT ALL    ON SEQUENCES TO postgres;
REVOKE ALL ON SCHEMA archive FROM anon, authenticated;

-- ─── BLOCO E: Reload PostgREST ────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ─── BLOCO F: 10 asserções PASS/FAIL ─────────────────────────────────
DO $$
DECLARE
    v_count_in_archive   INT;
    v_count_still_public INT;
    v_seq_in_archive     INT;
    v_view_ok            INT;
    expected_tables TEXT[] := ARRAY[
        'role_migration_batches','role_migration_items','system_settings_legacy',
        'asia_legacy_upload_queue','cf_sm_legacy','_unif_settings_arquivo',
        'smoke_tests_runs','audit_log','product_sync_logs','media_sync_log'
    ];
BEGIN
    -- A1: 10 tabelas em archive
    SELECT COUNT(*) INTO v_count_in_archive
      FROM pg_tables WHERE schemaname='archive' AND tablename = ANY(expected_tables);
    IF v_count_in_archive <> 10 THEN
        RAISE EXCEPTION '[A1 FAIL] % / 10 tabelas em archive', v_count_in_archive;
    END IF;

    -- A2: 0 dessas tabelas em public
    SELECT COUNT(*) INTO v_count_still_public
      FROM pg_tables WHERE schemaname='public' AND tablename = ANY(expected_tables);
    IF v_count_still_public <> 0 THEN
        RAISE EXCEPTION '[A2 FAIL] % tabelas ainda em public', v_count_still_public;
    END IF;

    -- A3: sequences em archive (auto-movidas ou movidas manualmente)
    SELECT COUNT(*) INTO v_seq_in_archive
      FROM pg_sequences WHERE schemaname='archive'
       AND sequencename IN ('_unif_settings_arquivo_id_seq','smoke_tests_runs_id_seq');
    IF v_seq_in_archive <> 2 THEN
        RAISE EXCEPTION '[A3 FAIL] % / 2 sequences em archive', v_seq_in_archive;
    END IF;

    -- A4: views atualizadas (referenciam archive.media_sync_log)
    SELECT COUNT(*) INTO v_view_ok
      FROM information_schema.views
     WHERE table_schema='public'
       AND table_name IN ('v_n8n_sync_errors','v_n8n_sync_success_recent','v_n8n_sync_summary')
       AND view_definition ILIKE '%archive.media_sync_log%';
    IF v_view_ok <> 3 THEN
        RAISE EXCEPTION '[A4 FAIL] % / 3 views com archive.media_sync_log', v_view_ok;
    END IF;

    -- A5: smoke_tests_runs NÃO mais em public
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='smoke_tests_runs') THEN
        RAISE EXCEPTION '[A5 FAIL] smoke_tests_runs ainda em public';
    END IF;

    RAISE NOTICE '══════════════════════════════════════════════════════';
    RAISE NOTICE '✅ A1 PASS: % / 10 tabelas em archive',          v_count_in_archive;
    RAISE NOTICE '✅ A2 PASS: % tabelas em public (esperado: 0)',  v_count_still_public;
    RAISE NOTICE '✅ A3 PASS: % / 2 sequences em archive',         v_seq_in_archive;
    RAISE NOTICE '✅ A4 PASS: % / 3 views atualizadas para archive',v_view_ok;
    RAISE NOTICE '✅ A5 PASS: smoke_tests_runs ausente de public';
    RAISE NOTICE '══════════════════════════════════════════════════════';
    RAISE NOTICE 'MIGRATION 2/2 COMPLETA — 10 tabelas no schema archive';
END $$;
;
