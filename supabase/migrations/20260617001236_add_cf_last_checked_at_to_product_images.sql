
-- P1.5: Fix cf_verified_at semantic ambiguity
-- cf_verified_at   = timestamp when image was last CONFIRMED PRESENT in Cloudflare
-- cf_last_checked_at = timestamp when CF API was last called (any result: present OR absent)

ALTER TABLE product_images
  ADD COLUMN IF NOT EXISTS cf_last_checked_at TIMESTAMPTZ;

COMMENT ON COLUMN product_images.cf_verified_at IS
  'Timestamp when this image was last confirmed PRESENT in Cloudflare Images API. NULL if never verified or if currently missing.';

COMMENT ON COLUMN product_images.cf_last_checked_at IS
  'Timestamp of the most recent Cloudflare Images API check, regardless of result (verified or missing). Used to track check freshness.';

-- Backfill: for verified records, cf_last_checked_at = cf_verified_at (check confirmed presence)
-- For missing records, cf_last_checked_at = cf_verified_at (check confirmed absence — semantic fix)
UPDATE product_images
SET cf_last_checked_at = cf_verified_at
WHERE cf_verified_at IS NOT NULL
  AND cf_last_checked_at IS NULL;

-- For missing records: cf_verified_at should be NULL (not present = not verified)
-- We preserve the timestamp in cf_last_checked_at then clear cf_verified_at for missing records
UPDATE product_images
SET
  cf_last_checked_at = COALESCE(cf_last_checked_at, cf_verified_at),
  cf_verified_at = NULL
WHERE cf_sync_status = 'missing'
  AND cf_verified_at IS NOT NULL;

-- Index for query performance (checking stale records)
CREATE INDEX IF NOT EXISTS idx_product_images_cf_last_checked_at
  ON product_images (cf_last_checked_at)
  WHERE cf_last_checked_at IS NOT NULL;
;
