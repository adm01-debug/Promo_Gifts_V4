
-- ============================================================
-- MIGRATION: move_staging_tables_to_archive_schema
-- ============================================================
-- Strategy : physical move to archive + forwarding auto-updatable
--            views in public (zero breaking change for 15+ fns)
-- Tables   : 5 (all staging)
-- Views    : 2 analytics (drop public → recreate in archive)
--            5 forwarding  (new in public, transparent aliases)
-- RLS      : policies move automatically with ALTER TABLE ... SET SCHEMA
-- PG17 note: FOR UPDATE SKIP LOCKED works through simple auto-updatable views
-- ============================================================

-- ── STEP 1: archive schema ────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS archive;

GRANT USAGE ON SCHEMA archive
    TO postgres, anon, authenticated, service_role;

-- ── STEP 2: drop views that block ALTER TABLE ─────────────────
DROP VIEW IF EXISTS public.v_import_staging_by_product;
DROP VIEW IF EXISTS public.v_import_staging_progress;

-- ── STEP 3: physical move ─────────────────────────────────────
-- (RLS policies, indexes, sequences, constraints migrate with the table)
ALTER TABLE public.color_analysis_staging  SET SCHEMA archive;
ALTER TABLE public.import_staging_images   SET SCHEMA archive;
ALTER TABLE public.scraper_images_staging  SET SCHEMA archive;
ALTER TABLE public.sm_images_staging       SET SCHEMA archive;
ALTER TABLE public.xbz_gallery_staging     SET SCHEMA archive;

-- ── STEP 4: permissions on archive tables ────────────────────
GRANT ALL ON archive.color_analysis_staging  TO service_role;
GRANT ALL ON archive.import_staging_images   TO service_role;
GRANT ALL ON archive.scraper_images_staging  TO service_role;
GRANT ALL ON archive.sm_images_staging       TO service_role;
GRANT ALL ON archive.xbz_gallery_staging     TO service_role;

GRANT SELECT ON archive.color_analysis_staging  TO authenticated, anon;
GRANT SELECT ON archive.import_staging_images   TO authenticated, anon;
GRANT SELECT ON archive.scraper_images_staging  TO authenticated, anon;
GRANT SELECT ON archive.sm_images_staging       TO authenticated, anon;
GRANT SELECT ON archive.xbz_gallery_staging     TO authenticated, anon;

-- ── STEP 5: auto-updatable forwarding views in public ─────────
-- Simple SELECT * → qualifies as auto-updatable in PG:
-- supports INSERT / UPDATE / DELETE / ON CONFLICT / FOR UPDATE SKIP LOCKED
CREATE VIEW public.color_analysis_staging AS
    SELECT * FROM archive.color_analysis_staging;

CREATE VIEW public.import_staging_images AS
    SELECT * FROM archive.import_staging_images;

CREATE VIEW public.scraper_images_staging AS
    SELECT * FROM archive.scraper_images_staging;

CREATE VIEW public.sm_images_staging AS
    SELECT * FROM archive.sm_images_staging;

CREATE VIEW public.xbz_gallery_staging AS
    SELECT * FROM archive.xbz_gallery_staging;

-- Audit comments
COMMENT ON VIEW public.color_analysis_staging IS
    '[ARCHIVED] forwarding view → archive.color_analysis_staging — do not add columns here';
COMMENT ON VIEW public.import_staging_images IS
    '[ARCHIVED] forwarding view → archive.import_staging_images — do not add columns here';
COMMENT ON VIEW public.scraper_images_staging IS
    '[ARCHIVED] forwarding view → archive.scraper_images_staging — do not add columns here';
COMMENT ON VIEW public.sm_images_staging IS
    '[ARCHIVED] forwarding view → archive.sm_images_staging — do not add columns here';
COMMENT ON VIEW public.xbz_gallery_staging IS
    '[ARCHIVED] forwarding view → archive.xbz_gallery_staging — do not add columns here';

-- ── STEP 6: permissions on forwarding views ───────────────────
GRANT SELECT ON public.color_analysis_staging  TO authenticated, anon;
GRANT SELECT ON public.import_staging_images   TO authenticated, anon;
GRANT SELECT ON public.scraper_images_staging  TO authenticated, anon;
GRANT SELECT ON public.sm_images_staging       TO authenticated, anon;
GRANT SELECT ON public.xbz_gallery_staging     TO authenticated, anon;

-- ── STEP 7: analytics views recreated in archive ─────────────
-- (reference archive.import_staging_images now)
CREATE VIEW archive.v_import_staging_by_product AS
    SELECT
        s.parsed_sku,
        p.name AS product_name,
        count(*)                                                    AS total_images,
        count(*) FILTER (WHERE s.status::text = 'completed')       AS completed,
        count(*) FILTER (WHERE s.status::text = 'pending')         AS pending,
        count(*) FILTER (WHERE s.status::text = ANY (
            ARRAY['upload_error'::varchar,'insert_error'::varchar]::text[]
        ))                                                          AS errors,
        count(*) FILTER (WHERE s.status::text = 'already_exists')  AS already_exists
    FROM archive.import_staging_images s
    LEFT JOIN public.products p ON s.product_id = p.id
    GROUP BY s.parsed_sku, p.name
    ORDER BY count(*) DESC;

CREATE VIEW archive.v_import_staging_progress AS
    SELECT
        status,
        count(*) AS total,
        round((count(*)::numeric * 100.0) / sum(count(*)) OVER (), 2) AS percentual
    FROM archive.import_staging_images
    GROUP BY status
    ORDER BY
        CASE status
            WHEN 'completed'     THEN 1
            WHEN 'uploaded'      THEN 2
            WHEN 'extracted'     THEN 3
            WHEN 'pending'       THEN 4
            WHEN 'already_exists'THEN 5
            WHEN 'no_product'    THEN 6
            WHEN 'no_color'      THEN 7
            WHEN 'upload_error'  THEN 8
            WHEN 'insert_error'  THEN 9
            WHEN 'skipped'       THEN 10
            ELSE NULL::integer
        END;

GRANT SELECT ON archive.v_import_staging_by_product TO authenticated, anon, service_role;
GRANT SELECT ON archive.v_import_staging_progress   TO authenticated, anon, service_role;

-- ── STEP 8: PostgREST schema reload ──────────────────────────
NOTIFY pgrst, 'reload schema';
;
