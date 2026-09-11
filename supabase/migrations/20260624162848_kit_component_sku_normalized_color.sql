CREATE OR REPLACE VIEW public.v_kit_component_skus AS
SELECT
  c.id                          AS component_id,
  c.kit_product_id,
  v.id                          AS variant_id,
  p.sku                         AS parent_sku,
  v.sku                         AS variant_sku,
  v.color_code                  AS variant_color_code,
  v.color_name                  AS variant_color_name,
  c.slot_code,
  c.component_name,
  c.component_type_code,
  c.is_packaging,
  c.color_id                    AS item_color_id,
  c.component_code              AS component_code_agnostico,
  -- CÓDIGO QUALIFICADO COLISÃO-SEGURO:
  --  • cor normalizada (internal_code) quando ela identifica unicamente a variante no kit
  --  • fallback para o SKU real da variante quando a cor canônica repete (sub-tons) ou está ausente
  CASE
    WHEN cv.internal_code IS NULL OR cv.internal_code = '' THEN v.sku || '-' || c.slot_code
    WHEN count(*) OVER (PARTITION BY c.kit_product_id, c.slot_code, cv.internal_code) = 1
         THEN p.sku || '-' || cv.internal_code || '-' || c.slot_code
    ELSE v.sku || '-' || c.slot_code
  END                           AS component_sku,
  c.primary_image_url           AS component_image_url,
  cv.internal_code              AS color_internal_code   -- nova coluna ao FINAL
FROM public.product_kit_components c
JOIN public.products p          ON p.id = c.kit_product_id
JOIN public.product_variants v  ON v.product_id = c.kit_product_id
LEFT JOIN public.color_variations cv ON cv.id = v.color_id;

NOTIFY pgrst, 'reload schema';;
