
-- MELHORIA 7: Dashboard aprimorado com métricas de deduplicação e qualidade

DROP VIEW IF EXISTS public.v_cf_drift_dashboard;

CREATE VIEW public.v_cf_drift_dashboard WITH (security_invoker = true) AS
WITH stats AS (
  SELECT
    -- Recon
    (SELECT COUNT(*) FROM cf_recon.cf_image)                                        AS recon_total,

    -- Produto x Cloudflare
    (SELECT COUNT(*) FROM public.product_images WHERE deleted_at IS NULL)            AS pi_active_total,
    (SELECT COUNT(*) FROM public.product_images WHERE deleted_at IS NULL AND cf_sync_status='verified')  AS pi_verified,
    (SELECT COUNT(*) FROM public.product_images WHERE deleted_at IS NULL AND cf_sync_status='orphaned')  AS pi_orphaned,
    (SELECT COUNT(*) FROM public.product_images WHERE deleted_at IS NULL AND cf_sync_status='missing')   AS pi_missing,
    (SELECT COUNT(*) FROM public.product_images WHERE deleted_at IS NOT NULL)        AS pi_soft_deleted,

    -- Divergências
    (SELECT COUNT(*) FROM cf_recon.cf_image c
     WHERE NOT EXISTS (SELECT 1 FROM public.product_images p
       WHERE p.cloudflare_image_id = c.image_id AND p.deleted_at IS NULL))          AS cf_orphans_not_in_pi,
    (SELECT COUNT(*) FROM public.product_images p
     WHERE p.deleted_at IS NULL AND p.cf_sync_status='verified'
       AND NOT EXISTS (SELECT 1 FROM cf_recon.cf_image c WHERE c.image_id = p.cloudflare_image_id)) AS pi_verified_no_recon,

    -- Backfill
    (SELECT COUNT(*) FROM public.image_backfill_queue WHERE status='pending')        AS backfill_queue_pending,
    (SELECT COUNT(*) FROM public.image_backfill_queue WHERE status='skipped')        AS backfill_queue_skipped,

    -- Deduplicação canônica
    (SELECT COUNT(*) FROM public.product_images WHERE deleted_at IS NULL AND canonical_image_id IS NOT NULL) AS pi_canonical_deps,
    (SELECT COUNT(DISTINCT canonical_image_id) FROM public.product_images WHERE deleted_at IS NULL AND canonical_image_id IS NOT NULL) AS pi_canonical_roots,

    -- Qualidade
    (SELECT COUNT(*) FROM public.product_images WHERE deleted_at IS NULL AND blurhash IS NOT NULL)       AS pi_has_blurhash,
    (SELECT COUNT(*) FROM public.product_images WHERE deleted_at IS NULL AND content_hash IS NOT NULL)   AS pi_has_content_hash,

    -- Cobertura de formato
    (SELECT COUNT(*) FROM public.product_images WHERE deleted_at IS NULL AND format IS NULL)             AS pi_null_format,

    -- Integridade is_shared
    (SELECT COUNT(*) FROM public.product_images WHERE deleted_at IS NULL AND is_shared = true AND canonical_image_id IS NULL) AS pi_shared_no_canonical
),
computed AS (
  SELECT *,
    ROUND((pi_verified::numeric     / NULLIF(pi_active_total,0)) * 100, 2) AS pct_verified_active,
    ROUND((cf_orphans_not_in_pi::numeric / NULLIF(recon_total,0)) * 100, 2) AS pct_cf_orphans,
    ROUND((pi_has_blurhash::numeric / NULLIF(pi_active_total,0)) * 100, 2) AS pct_blurhash,
    ROUND((pi_has_content_hash::numeric / NULLIF(pi_active_total,0)) * 100, 2) AS pct_content_hash,
    ROUND((pi_canonical_deps::numeric / NULLIF(pi_active_total,0)) * 100, 2) AS pct_deduplicated
  FROM stats
)
SELECT * FROM computed;

-- Segurança
REVOKE SELECT ON public.v_cf_drift_dashboard FROM anon, authenticated;
GRANT SELECT ON public.v_cf_drift_dashboard TO service_role;
;
