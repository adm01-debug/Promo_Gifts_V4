
CREATE OR REPLACE VIEW cf_recon.v_health_dashboard AS
SELECT
    (SELECT COUNT(*) FROM public.product_images)                               AS db_total,
    (SELECT COUNT(*) FROM public.product_images WHERE is_active)               AS db_active,
    (SELECT COUNT(*) FROM public.product_images WHERE cf_sync_status = 'verified') AS verified,
    (SELECT COUNT(*) FROM public.product_images WHERE cf_sync_status = 'pending')  AS pending,
    (SELECT COUNT(*) FROM public.product_images WHERE cf_sync_status = 'missing')  AS missing,
    (SELECT COUNT(*) FROM public.product_images
     WHERE cf_sync_status = 'missing' AND is_active)                           AS missing_active,
    (SELECT COUNT(*) FROM cf_recon.v_verification_queue)                       AS queue_real,
    (SELECT COUNT(*) FROM cf_recon.remediation WHERE status = 'open')          AS remediation_open,
    (SELECT COUNT(*) FROM cf_recon.cf_image)                                   AS cf_crawled,
    (SELECT COUNT(*) FROM cf_recon.action_log)                                 AS actions_logged,
    (SELECT COUNT(*) FROM cf_recon.cf_image WHERE crawl_run_id IS NULL)        AS cf_backfill_only,
    (SELECT COUNT(*) FROM cf_recon.cf_image WHERE crawl_run_id IS NOT NULL)    AS cf_crawl_confirmed,
    (SELECT COUNT(*) FROM cf_recon.v_divergence
     WHERE divergence_class = 'ok')                                            AS divergence_ok,
    (SELECT COUNT(*) FROM cf_recon.v_divergence
     WHERE divergence_class = 'ok_pending_crawl_confirmation')                 AS divergence_pending,
    (SELECT COUNT(*) FROM cf_recon.v_divergence
     WHERE divergence_class LIKE 'broken%')                                    AS divergence_broken;
;
