-- mirror: DDL aplicada em produção fora do fluxo de migration (out-of-band)
-- Rollback: see supabase/rollbacks/20261019000000_rollback.sql
-- Detectado por: db-schema-drift-check run 39251404944 em 2026-10-19
-- Objetos:
--   1. frontend_telemetry_size_caps_check — constraint com campos adicionais (url/user_agent/session_id/metadata)
--   2. v_system_health_dashboard — view atualizada com métricas bi/stock_snapshots e stock_daily_summary
-- Aprovado: REGRA #8 CLAUDE.md — objeto criado em produção sem migration vira migration espelho

alter table "public"."frontend_telemetry" drop constraint if exists "frontend_telemetry_size_caps_check";
alter table "public"."frontend_telemetry" add constraint "frontend_telemetry_size_caps_check" CHECK ((((length(COALESCE(event_type, ''::text)) >= 1) AND (length(COALESCE(event_type, ''::text)) <= 64)) AND ((length(COALESCE(name, ''::text)) >= 1) AND (length(COALESCE(name, ''::text)) <= 256)) AND (length(COALESCE(url, ''::text)) <= 2048) AND (length(COALESCE(user_agent, ''::text)) <= 1024) AND (length(COALESCE(session_id, ''::text)) <= 128) AND (length(COALESCE((metadata)::text, ''::text)) <= 8192))) not valid;
alter table "public"."frontend_telemetry" validate constraint "frontend_telemetry_size_caps_check";

set check_function_bodies = off;

create or replace view "public"."v_system_health_dashboard" as  WITH metrics AS (
         SELECT 'database'::text AS categoria,
            'total_tables_public'::text AS metrica,
            (( SELECT count(*) AS count
                   FROM (pg_class c
                     JOIN pg_namespace n ON ((n.oid = c.relnamespace)))
                  WHERE ((n.nspname = 'public'::name) AND (c.relkind = 'r'::"char"))))::text AS valor,
            'count'::text AS unit
        UNION ALL
         SELECT 'database'::text,
            'total_functions'::text,
            (( SELECT count(*) AS count
                   FROM (pg_proc p
                     JOIN pg_namespace n ON ((n.oid = p.pronamespace)))
                  WHERE (n.nspname = 'public'::name)))::text AS count,
            'count'::text
        UNION ALL
         SELECT 'database'::text,
            'total_triggers'::text,
            (( SELECT count(*) AS count
                   FROM ((pg_trigger t
                     JOIN pg_class c ON ((c.oid = t.tgrelid)))
                     JOIN pg_namespace n ON ((n.oid = c.relnamespace)))
                  WHERE ((n.nspname = 'public'::name) AND (NOT t.tgisinternal))))::text AS count,
            'count'::text
        UNION ALL
         SELECT 'database'::text,
            'total_indexes'::text,
            (( SELECT count(*) AS count
                   FROM pg_indexes
                  WHERE (pg_indexes.schemaname = 'public'::name)))::text AS count,
            'count'::text
        UNION ALL
         SELECT 'database'::text,
            'total_rls_policies'::text,
            (( SELECT count(*) AS count
                   FROM pg_policies
                  WHERE (pg_policies.schemaname = 'public'::name)))::text AS count,
            'count'::text
        UNION ALL
         SELECT 'database'::text,
            'realtime_published_tables'::text,
            (( SELECT count(*) AS count
                   FROM pg_publication_tables
                  WHERE (pg_publication_tables.pubname = 'supabase_realtime'::name)))::text AS count,
            'count'::text
        UNION ALL
         SELECT 'catalog'::text,
            'total_products'::text,
            (( SELECT count(*) AS count
                   FROM public.products))::text AS count,
            'count'::text
        UNION ALL
         SELECT 'catalog'::text,
            'active_products'::text,
            (( SELECT count(*) AS count
                   FROM public.products
                  WHERE (products.is_active = true)))::text AS count,
            'count'::text
        UNION ALL
         SELECT 'catalog'::text,
            'products_with_image'::text,
            (( SELECT count(*) AS count
                   FROM public.products
                  WHERE (products.primary_image_url IS NOT NULL)))::text AS count,
            'count'::text
        UNION ALL
         SELECT 'catalog'::text,
            'products_with_ncm'::text,
            (( SELECT count(*) AS count
                   FROM public.products
                  WHERE (products.ncm_id IS NOT NULL)))::text AS count,
            'count'::text
        UNION ALL
         SELECT 'catalog'::text,
            'products_with_ai_description'::text,
            (( SELECT count(*) AS count
                   FROM public.products
                  WHERE (products.ai_description IS NOT NULL)))::text AS count,
            'count'::text
        UNION ALL
         SELECT 'catalog'::text,
            'total_variants'::text,
            (( SELECT count(*) AS count
                   FROM public.product_variants))::text AS count,
            'count'::text
        UNION ALL
         SELECT 'catalog'::text,
            'active_variants'::text,
            (( SELECT count(*) AS count
                   FROM public.product_variants
                  WHERE (product_variants.is_active = true)))::text AS count,
            'count'::text
        UNION ALL
         SELECT 'catalog'::text,
            'total_images'::text,
            (( SELECT count(*) AS count
                   FROM public.product_images))::text AS count,
            'count'::text
        UNION ALL
         SELECT 'catalog'::text,
            'total_videos'::text,
            (( SELECT count(*) AS count
                   FROM public.product_videos))::text AS count,
            'count'::text
        UNION ALL
         SELECT 'catalog'::text,
            'total_categories'::text,
            (( SELECT count(*) AS count
                   FROM public.categories
                  WHERE (categories.is_active = true)))::text AS count,
            'count'::text
        UNION ALL
         SELECT 'catalog'::text,
            'total_stock_units'::text,
            (COALESCE(( SELECT sum(variant_supplier_sources.quantity) AS sum
                   FROM public.variant_supplier_sources
                  WHERE (variant_supplier_sources.is_active = true)), (0)::bigint))::text AS "coalesce",
            'units'::text
        UNION ALL
         SELECT 'suppliers'::text,
            'total_suppliers'::text,
            (( SELECT count(*) AS count
                   FROM public.suppliers))::text AS count,
            'count'::text
        UNION ALL
         SELECT 'suppliers'::text,
            'active_sync_suppliers'::text,
            (( SELECT count(*) AS count
                   FROM public.suppliers
                  WHERE (suppliers.sync_enabled = true)))::text AS count,
            'count'::text
        UNION ALL
         SELECT 'suppliers'::text,
            'pending_import_batches'::text,
            (( SELECT count(DISTINCT supplier_products_raw.import_batch_id) AS count
                   FROM public.supplier_products_raw
                  WHERE (supplier_products_raw.status <> 'processed'::public.supplier_raw_status)))::text AS count,
            'count'::text
        UNION ALL
         SELECT 'ai'::text,
            'ai_queue_pending'::text,
            (( SELECT count(*) AS count
                   FROM public.ai_enrichment_queue
                  WHERE (ai_enrichment_queue.status = 'pending'::text)))::text AS count,
            'count'::text
        UNION ALL
         SELECT 'ai'::text,
            'ai_queue_completed'::text,
            (( SELECT count(*) AS count
                   FROM public.ai_enrichment_queue
                  WHERE (ai_enrichment_queue.status = 'done'::text)))::text AS count,
            'count'::text
        UNION ALL
         SELECT 'ai'::text,
            'ai_queue_stuck'::text,
            (( SELECT count(*) AS count
                   FROM public.ai_enrichment_queue
                  WHERE ((ai_enrichment_queue.status = 'processing'::text) AND (ai_enrichment_queue.locked_at < (now() - '02:00:00'::interval)))))::text AS count,
            'count'::text
        UNION ALL
         SELECT 'crm'::text,
            'total_quotes'::text,
            (( SELECT count(*) AS count
                   FROM public.quotes))::text AS count,
            'count'::text
        UNION ALL
         SELECT 'crm'::text,
            'total_orders'::text,
            (( SELECT count(*) AS count
                   FROM public.orders))::text AS count,
            'count'::text
        UNION ALL
         SELECT 'auth'::text,
            'total_users'::text,
            (( SELECT count(*) AS count
                   FROM auth.users))::text AS count,
            'count'::text
        UNION ALL
         SELECT 'auth'::text,
            'total_organizations'::text,
            (( SELECT count(*) AS count
                   FROM public.organizations))::text AS count,
            'count'::text
        UNION ALL
         SELECT 'cron'::text,
            'active_jobs'::text,
            (( SELECT count(*) AS count
                   FROM cron.job
                  WHERE (job.active = true)))::text AS count,
            'count'::text
        UNION ALL
         SELECT 'cron'::text,
            'failed_runs_24h'::text,
            (( SELECT count(*) AS count
                   FROM cron.job_run_details
                  WHERE ((job_run_details.status = 'failed'::text) AND (job_run_details.start_time > (now() - '24:00:00'::interval)))))::text AS count,
            'count'::text
        UNION ALL
         SELECT 'cron'::text,
            'succeeded_runs_24h'::text,
            (( SELECT count(*) AS count
                   FROM cron.job_run_details
                  WHERE ((job_run_details.status = 'succeeded'::text) AND (job_run_details.start_time > (now() - '24:00:00'::interval)))))::text AS count,
            'count'::text
        UNION ALL
         SELECT 'bi'::text,
            'stock_snapshots_count'::text,
            (( SELECT count(*) AS count
                   FROM public.stock_snapshots))::text AS count,
            'count'::text
        UNION ALL
         SELECT 'bi'::text,
            'stock_daily_summary_count'::text,
            (( SELECT count(*) AS count
                   FROM public.stock_daily_summary))::text AS count,
            'count'::text
        UNION ALL
         SELECT 'storage'::text,
            'db_total_size'::text,
            pg_size_pretty(pg_database_size(current_database())) AS pg_size_pretty,
            'size'::text
        UNION ALL
         SELECT 'storage'::text,
            'indexes_size_public'::text,
            ( SELECT pg_size_pretty(sum(pg_relation_size((pg_stat_user_indexes.indexrelid)::regclass))) AS pg_size_pretty
                   FROM pg_stat_user_indexes
                  WHERE (pg_stat_user_indexes.schemaname = 'public'::name)) AS pg_size_pretty,
            'size'::text
        )
 SELECT categoria,
    metrica,
    valor,
    unit,
    now() AS captured_at
   FROM metrics
  ORDER BY categoria, metrica;
