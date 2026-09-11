
BEGIN;

UPDATE public.product_images
SET
  canonical_image_id = '254dea34-123d-45ca-9a93-1901c81bc4ef',
  last_modified_source = 'migration',
  updated_at = NOW()
WHERE id = '45c83c45-fbc5-45b2-bed2-0f8a7f32b48a'
  AND canonical_image_id = 'd39af6e6-2b2a-418b-a139-0acda20cb6af'
  AND is_shared = true;

UPDATE public.product_images
SET
  canonical_image_id = '2238f75c-800f-4d18-a499-bddd253824fc',
  last_modified_source = 'migration',
  updated_at = NOW()
WHERE id = '918192cc-6714-452d-9886-f1eb5edc2988'
  AND canonical_image_id = 'c9d485ea-4d41-4873-8ce6-990d1e0f793b'
  AND is_shared = true;

DO $$
DECLARE
  chain_count int;
  c07_status  text;
  c07_value   int;
BEGIN
  SELECT COUNT(*) INTO chain_count
  FROM public.product_images pi
  JOIN public.product_images root ON root.id = pi.canonical_image_id
  WHERE pi.is_shared = true
    AND pi.canonical_image_id IS NOT NULL
    AND root.canonical_image_id IS NOT NULL;

  IF chain_count <> 0 THEN
    RAISE EXCEPTION 'C07 still has % chain violation(s) after migration', chain_count;
  END IF;

  SELECT status::text, value::int
  INTO c07_status, c07_value
  FROM fn_product_images_health_check()
  WHERE check_name = 'c07_canonical_chains_flat';

  IF c07_status <> 'OK' THEN
    RAISE EXCEPTION 'C07 health check still FAIL: value=%, expected OK', c07_value;
  END IF;

  RAISE NOTICE 'C07 repair verified: % chain violations remain (expected 0)', chain_count;
END;
$$;

COMMIT;
;
