CREATE OR REPLACE FUNCTION public.fn_apply_supplier_flag_tags(p_product_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_raw      RECORD;
  v_catalogs text;
  v_added    integer := 0;
  v_rows     integer;
BEGIN
  FOR v_raw IN
    SELECT spr.raw_data
    FROM supplier_products_raw spr
    WHERE spr.product_id = p_product_id
      AND spr.status = 'processed'
  LOOP
    v_catalogs := LOWER(COALESCE(v_raw.raw_data->>'Catalogs', ''));

    -- IsStockOut → sob-encomenda
    IF (v_raw.raw_data->>'IsStockOut' = 'true') THEN
      INSERT INTO product_tags (product_id, tag_id)
      SELECT p_product_id, id FROM tags WHERE slug = 'sob-encomenda' AND is_active = true
      ON CONFLICT (product_id, tag_id) DO NOTHING;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_added := v_added + v_rows;
    END IF;

    -- NewProduct → lancamento + novidades-spot
    IF (v_raw.raw_data->>'NewProduct' = 'true') THEN
      INSERT INTO product_tags (product_id, tag_id)
      SELECT p_product_id, id FROM tags WHERE slug IN ('lancamento','novidades-spot') AND is_active = true
      ON CONFLICT (product_id, tag_id) DO NOTHING;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_added := v_added + v_rows;
    END IF;

    -- Our Nature → our-nature + sustentavel + eco-friendly
    IF v_catalogs ILIKE '%our nature%' THEN
      INSERT INTO product_tags (product_id, tag_id)
      SELECT p_product_id, id FROM tags WHERE slug IN ('our-nature','sustentavel','eco-friendly') AND is_active = true
      ON CONFLICT (product_id, tag_id) DO NOTHING;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_added := v_added + v_rows;
    END IF;

    -- Novidades → lancamento + novidades-spot
    IF v_catalogs ILIKE '%novidades%' THEN
      INSERT INTO product_tags (product_id, tag_id)
      SELECT p_product_id, id FROM tags WHERE slug IN ('lancamento','novidades-spot') AND is_active = true
      ON CONFLICT (product_id, tag_id) DO NOTHING;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_added := v_added + v_rows;
    END IF;

    -- Últimas Chegadas → ultimas-chegadas
    IF v_catalogs ILIKE '%timas chegadas%' THEN
      INSERT INTO product_tags (product_id, tag_id)
      SELECT p_product_id, id FROM tags WHERE slug = 'ultimas-chegadas' AND is_active = true
      ON CONFLICT (product_id, tag_id) DO NOTHING;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_added := v_added + v_rows;
    END IF;

    -- TimeVaiBrasil → time-vai-brasil
    IF v_catalogs ILIKE '%timevai%' OR v_catalogs ILIKE '%time vai%' THEN
      INSERT INTO product_tags (product_id, tag_id)
      SELECT p_product_id, id FROM tags WHERE slug = 'time-vai-brasil' AND is_active = true
      ON CONFLICT (product_id, tag_id) DO NOTHING;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_added := v_added + v_rows;
    END IF;

    -- PvcFree → pvc-free
    IF (v_raw.raw_data->>'PvcFree' = 'true') THEN
      INSERT INTO product_tags (product_id, tag_id)
      SELECT p_product_id, id FROM tags WHERE slug = 'pvc-free' AND is_active = true
      ON CONFLICT (product_id, tag_id) DO NOTHING;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_added := v_added + v_rows;
    END IF;

    -- NoReplenishment → sem-reposicao
    IF (v_raw.raw_data->>'NoReplenishment' = 'true') THEN
      INSERT INTO product_tags (product_id, tag_id)
      SELECT p_product_id, id FROM tags WHERE slug = 'sem-reposicao' AND is_active = true
      ON CONFLICT (product_id, tag_id) DO NOTHING;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_added := v_added + v_rows;
    END IF;

    -- IsSeasonal → sazonal
    IF (v_raw.raw_data->>'IsSeasonal' = 'true') THEN
      INSERT INTO product_tags (product_id, tag_id)
      SELECT p_product_id, id FROM tags WHERE slug = 'sazonal' AND is_active = true
      ON CONFLICT (product_id, tag_id) DO NOTHING;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_added := v_added + v_rows;
    END IF;

  END LOOP;

  RETURN jsonb_build_object('success', true, 'product_id', p_product_id, 'added', v_added);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'product_id', p_product_id, 'error', SQLERRM);
END;
$function$
