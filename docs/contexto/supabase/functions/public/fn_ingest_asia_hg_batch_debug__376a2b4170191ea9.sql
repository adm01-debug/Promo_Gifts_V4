CREATE OR REPLACE FUNCTION public.fn_ingest_asia_hg_batch_debug(p_produto jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_supplier_id     uuid := 'd2734e23-d633-4819-bb15-e51aa44e2118';
  v_sku             text;
  v_f3_patch        jsonb;
  v_sqf             int;
  v_sp              boolean;
  v_asp             boolean;
BEGIN
  v_sku := trim(p_produto->>'sku');
  v_sqf := NULLIF(NULLIF(trim(COALESCE(p_produto->>'stock_quantity_future','')), ''), 'null')::int;
  v_sp  := CASE WHEN (p_produto->>'susceptible_product') IN ('true','false') 
                THEN (p_produto->>'susceptible_product')::boolean ELSE NULL END;
  v_asp := CASE WHEN (p_produto->>'active_stock_sp') IN ('true','false') 
                THEN (p_produto->>'active_stock_sp')::boolean ELSE NULL END;

  v_f3_patch := jsonb_build_object(
    '_f3_fonte', 'test',
    'hg_id', p_produto->>'id',
    'susceptible_product', v_sp,
    'active_stock_sp', v_asp,
    'stock_quantity_future', v_sqf,
    'characteristics_image', COALESCE(p_produto->'characteristics_images'->'featured_image', 'null'::jsonb),
    'video_embed_urls', COALESCE(
      (SELECT jsonb_agg(emb)
       FROM jsonb_array_elements(COALESCE(p_produto->'video_product','[]'::jsonb)) vp,
            jsonb_array_elements(COALESCE(vp->'embedUrl','[]'::jsonb)) emb),
      '[]'::jsonb
    ),
    'tags_styled', COALESCE(p_produto->'tags', '[]'::jsonb),
    'variations_hg', COALESCE(p_produto->'variations', '[]'::jsonb)
  );
  
  RETURN 'OK: sku=' || v_sku || ' sqf=' || COALESCE(v_sqf::text,'NULL') 
         || ' patch_size=' || length(v_f3_patch::text);
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERRO: sku=' || COALESCE(v_sku,'?') || ' msg=' || SQLERRM || ' detail=' || SQLSTATE;
END;
$function$
