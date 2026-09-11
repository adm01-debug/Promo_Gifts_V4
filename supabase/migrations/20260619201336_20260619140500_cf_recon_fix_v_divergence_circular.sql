
CREATE OR REPLACE VIEW cf_recon.v_divergence AS
SELECT
    pi.id                                                          AS db_id,
    pi.cloudflare_image_id,
    pi.cf_sync_status,
    pi.cf_id_scheme,
    pi.source_supplier,
    pi.is_active,
    pi.deleted_at IS NOT NULL                                      AS is_deleted,
    ci.image_id IS NOT NULL                                        AS exists_in_cf,
    CASE
        WHEN ci.image_id IS NOT NULL
             AND ci.crawl_run_id IS NOT NULL
             AND pi.cf_sync_status = 'verified'                    THEN 'ok'
        WHEN ci.image_id IS NOT NULL
             AND ci.crawl_run_id IS NULL
             AND pi.cf_sync_status = 'verified'                    THEN 'ok_pending_crawl_confirmation'
        WHEN ci.image_id IS NOT NULL
             AND pi.cf_sync_status <> 'verified'                   THEN 'cf_present_db_unverified'
        WHEN ci.image_id IS NULL
             AND pi.deleted_at IS NOT NULL                         THEN 'deleted_noise'
        WHEN ci.image_id IS NULL
             AND pi.is_active                                      THEN 'broken_reference_active'
        WHEN ci.image_id IS NULL
             AND NOT pi.is_active                                  THEN 'broken_reference_inactive'
        ELSE 'ok'
    END                                                            AS divergence_class,
    (ci.image_id IS NOT NULL AND ci.crawl_run_id IS NOT NULL)      AS exists_in_cf_confirmed
FROM public.product_images pi
LEFT JOIN cf_recon.cf_image ci
       ON ci.image_id = pi.cloudflare_image_id::text;
;
