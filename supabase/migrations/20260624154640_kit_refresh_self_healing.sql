CREATE OR REPLACE FUNCTION public.fn_refresh_kit_component_variant_skus()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE v_ins integer; v_heal integer;
BEGIN
  -- 1) inserir novidades (novos componentes/variantes), semeando imagem/cor
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

  -- 2) auto-curar imagens que chegaram depois — SOMENTE onde está NULL (nunca sobrescreve)
  UPDATE public.kit_component_variant_skus k
  SET primary_image_url = c.primary_image_url,
      image_source      = 'inherited_component',
      updated_at        = now()
  FROM public.product_kit_components c
  WHERE c.id = k.component_id
    AND k.primary_image_url IS NULL
    AND c.primary_image_url IS NOT NULL;
  GET DIAGNOSTICS v_heal = ROW_COUNT;

  RETURN v_ins + v_heal;
END;
$fn$;
COMMENT ON FUNCTION public.fn_refresh_kit_component_variant_skus() IS
  'Sincroniza kit_component_variant_skus: (1) insere novos pares componente×variante; (2) auto-cura primary_image_url onde estiver NULL a partir do componente. Idempotente, não sobrescreve imagem já definida. Deleções cobertas por ON DELETE CASCADE.';;
