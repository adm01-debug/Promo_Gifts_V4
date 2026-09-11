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
  (v.sku || '-' || c.slot_code) AS component_sku,
  c.primary_image_url           AS component_image_url   -- nova coluna ao FINAL
FROM public.product_kit_components c
JOIN public.products p          ON p.id = c.kit_product_id
JOIN public.product_variants v  ON v.product_id = c.kit_product_id;

CREATE OR REPLACE FUNCTION public.fn_refresh_kit_component_variant_skus()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE v_ins integer;
BEGIN
  INSERT INTO public.kit_component_variant_skus
    (component_id, variant_id, kit_product_id, component_sku, slot_code, is_packaging,
     variant_color_code, variant_color_name, component_name, item_color_id,
     primary_image_url, image_source)
  SELECT s.component_id, s.variant_id, s.kit_product_id, s.component_sku, s.slot_code, s.is_packaging,
         s.variant_color_code, s.variant_color_name, s.component_name, s.item_color_id,
         s.component_image_url,
         CASE WHEN s.component_image_url IS NOT NULL THEN 'inherited_component' END
  FROM public.v_kit_component_skus s
  ON CONFLICT (component_id, variant_id) DO NOTHING;
  GET DIAGNOSTICS v_ins = ROW_COUNT;
  RETURN v_ins;
END;
$fn$;

NOTIFY pgrst, 'reload schema';;
