CREATE OR REPLACE FUNCTION public.fn_ingest_asia_hg_debug_sample(p_produtos jsonb, p_max_erros integer DEFAULT 5)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_supplier_id uuid := 'd2734e23-d633-4819-bb15-e51aa44e2118';
  v_produto     jsonb;
  v_sku         text;
  v_erros       jsonb := '[]'::jsonb;
  v_sqf         int;
  v_patch       jsonb;
  v_ok          int := 0;
BEGIN
  FOR v_produto IN SELECT * FROM jsonb_array_elements(p_produtos)
  LOOP
    BEGIN
      v_sku := trim(v_produto->>'sku');
      IF v_sku IS NULL OR v_sku = '' THEN CONTINUE; END IF;
      
      v_sqf := NULLIF(NULLIF(trim(COALESCE(v_produto->>'stock_quantity_future','')), ''), 'null')::int;

      v_patch := jsonb_build_object(
        '_f3_fonte',              'hg_products_publico',
        '_f3_updated_at',         to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SSZ'),
        'hg_id',                  v_produto->>'id',
        'susceptible_product',    CASE WHEN (v_produto->>'susceptible_product') IN ('true','false') THEN (v_produto->>'susceptible_product')::boolean ELSE NULL END,
        'active_stock_sp',        CASE WHEN (v_produto->>'active_stock_sp') IN ('true','false') THEN (v_produto->>'active_stock_sp')::boolean ELSE NULL END,
        'stock_quantity_future',  v_sqf,
        'characteristics_image',  COALESCE(v_produto->'characteristics_images'->'featured_image', 'null'::jsonb),
        'video_embed_urls', COALESCE(
          (SELECT jsonb_agg(emb)
           FROM jsonb_array_elements(COALESCE(v_produto->'video_product','[]'::jsonb)) vp,
                jsonb_array_elements(COALESCE(vp->'embedUrl','[]'::jsonb)) emb),
          '[]'::jsonb
        ),
        'tags_styled',    COALESCE(v_produto->'tags',       '[]'::jsonb),
        'variations_hg',  COALESCE(v_produto->'variations', '[]'::jsonb)
      );
      
      -- Tenta o UPDATE sem capturar erro
      UPDATE supplier_products_raw SET
        site_data  = COALESCE(site_data, '{}'::jsonb) || v_patch,
        updated_at = now()
      WHERE supplier_id = v_supplier_id
        AND (
          supplier_sku = v_sku OR supplier_sku = v_sku || 'P'
          OR supplier_sku LIKE v_sku || '-%'
          OR raw_data->>'referencia' = v_sku
          OR (raw_data->>'referencia' IS NOT NULL AND raw_data->>'referencia' != ''
              AND v_sku LIKE (raw_data->>'referencia') || '%')
        );
      v_ok := v_ok + 1;

    EXCEPTION WHEN OTHERS THEN
      IF jsonb_array_length(v_erros) < p_max_erros THEN
        v_erros := v_erros || jsonb_build_object(
          'sku', v_sku,
          'erro', SQLERRM,
          'estado', SQLSTATE,
          'sqf_raw', v_produto->>'stock_quantity_future',
          'sp_raw', v_produto->>'susceptible_product'
        );
      END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object('ok', v_ok, 'erros', v_erros);
END;
$function$
