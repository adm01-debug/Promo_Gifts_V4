-- 3 variantes ativas com color_id válido porém color_name vazio (02089, 067-4GB, 13830 -> "Azul Royal").
-- Backfill color_name a partir de color_variations.name (fonte canônica do color_id).
-- Dispara fn_trigger_sync_colors_to_product -> sincroniza products.colors/has_colors e reconstrói color_swatches.
UPDATE product_variants v SET color_name = cv.name, updated_at = now()
FROM color_variations cv
WHERE cv.id = v.color_id
  AND v.is_active AND v.color_id IS NOT NULL
  AND NULLIF(TRIM(v.color_name),'') IS NULL
  AND NULLIF(TRIM(cv.name),'') IS NOT NULL;;
