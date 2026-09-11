
INSERT INTO cf_recon.action_log
  (actor, action, image_db_id, cf_image_id, product_id,
   old_status, new_status, evidence, reversible)
SELECT
  'claude',
  'close_stale_remediation',
  NULL,
  r.cf_image_id,
  NULL,
  'remediation_open',
  'remediation_done',
  jsonb_build_object(
    'reason',           'backfill_only_circular_detection_pre_p5',
    'remediation_id',   r.id,
    'kind',             r.kind,
    'cf_image_exists',  (ci.image_id IS NOT NULL),
    'crawl_confirmed',  false,
    'action_required',  're_evaluate_after_full_crawl_v_cf_orphans',
    'migration',        '20260619140700_cf_recon_close_stale_cf_orphan_no_pi'
  ),
  false
FROM cf_recon.remediation r
LEFT JOIN cf_recon.cf_image ci ON ci.image_id = r.cf_image_id
WHERE r.kind = 'cf_orphan_no_pi'
  AND r.status = 'open';

UPDATE cf_recon.remediation
SET status = 'done'
WHERE kind = 'cf_orphan_no_pi'
  AND status = 'open';
;
