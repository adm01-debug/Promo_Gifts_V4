
-- Step 1: Backfill image_db_id from product_images via cloudflare_image_id
UPDATE cf_recon.remediation r
SET image_db_id = pi.id
FROM public.product_images pi
WHERE pi.cloudflare_image_id = r.cf_image_id
  AND r.kind = 'recover_url_original'
  AND r.status = 'open'
  AND r.image_db_id IS NULL;

-- Step 2: Backfill product_id from product_images after image_db_id is set
UPDATE cf_recon.remediation r
SET product_id = pi.product_id
FROM public.product_images pi
WHERE pi.id = r.image_db_id
  AND r.kind = 'recover_url_original'
  AND r.status = 'open'
  AND r.product_id IS NULL;

-- Step 3: Log all closures to action_log (immutable audit trail)
INSERT INTO cf_recon.action_log
  (actor, action, image_db_id, cf_image_id, product_id,
   old_status, new_status, evidence, reversible)
SELECT
  'claude',
  'close_stale_remediation',
  r.image_db_id,
  r.cf_image_id,
  r.product_id,
  'remediation_open',
  'remediation_done',
  jsonb_build_object(
    'reason',           'pipeline_verified_since_remediation_opened',
    'remediation_id',   r.id,
    'kind',             r.kind,
    'pi_cf_sync_status', pi.cf_sync_status,
    'pi_is_active',     pi.is_active,
    'pi_id',            pi.id,
    'migration',        '20260619140400_cf_recon_close_stale_recover_url_remediation'
  ),
  false
FROM cf_recon.remediation r
JOIN public.product_images pi ON pi.id = r.image_db_id
WHERE r.kind = 'recover_url_original'
  AND r.status = 'open';

-- Step 4: Close the remediations
UPDATE cf_recon.remediation
SET status = 'done'
WHERE kind = 'recover_url_original'
  AND status = 'open';
;
