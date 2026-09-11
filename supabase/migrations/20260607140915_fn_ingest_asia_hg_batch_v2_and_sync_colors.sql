
-- ============================================================
-- fn_ingest_asia_hg_batch v2
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_ingest_asia_hg_batch(
  p_produtos jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supplier_id     uuid := 'd2734e23-d633-4819-bb15-e51aa44e2118';
  v_atualizados     int  := 0;
  v_nao_encontrados int  := 0;
  v_erros           int  := 0;
  v_row_count       int;
  v_produto         jsonb;
  v_sku             text;
  v_f3_patch        jsonb;
  v_hash_novo       text;
BEGIN
  FOR v_produto IN SELECT * FROM jsonb_array_elements(p_produtos)
  LOOP
    BEGIN
      v_sku := trim(v_produto->>'sku');
      IF v_sku IS NULL OR v_sku = '' THEN CONTINUE; END IF;

      v_f3_patch := jsonb_build_object(
        '_f3_fonte',          'hg_products_publico',
        '_f3_updated_at',     to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SSZ'),
        'hg_id',              (v_produto->>'id'),
        'susceptible_product',(v_produto->>'susceptible_product')::boolean,
        'active_stock_sp',    (v_produto->>'active_stock_sp')::boolean,
        'stock_quantity_future',(v_produto->>'stock_quantity_future')::int,
        'characteristics_image', v_produto->'characteristics_images'->'featured_image',
        'video_embed_urls', COALESCE(
          (SELECT jsonb_agg(emb)
           FROM jsonb_array_elements(COALESCE(v_produto->'video_product','[]'::jsonb)) vp,
                jsonb_array_elements(COALESCE(vp->'embedUrl','[]'::jsonb)) emb),
          '[]'::jsonb
        ),
        'tags_styled',    COALESCE(v_produto->'tags',       '[]'::jsonb),
        'variations_hg',  COALESCE(v_produto->'variations', '[]'::jsonb)
      );

      v_hash_novo := md5(v_f3_patch::text);

      WITH rows_to_update AS (
        SELECT id, site_data->>'_f3_hash' as hash_atual
        FROM supplier_products_raw
        WHERE supplier_id = v_supplier_id
          AND (
            supplier_sku = v_sku
            OR supplier_sku = v_sku || 'P'
            OR supplier_sku LIKE v_sku || '-%'
            OR raw_data->>'referencia' = v_sku
          )
      )
      UPDATE supplier_products_raw spr SET
        site_data  = COALESCE(site_data, '{}'::jsonb)
                     || v_f3_patch
                     || jsonb_build_object('_f3_hash', v_hash_novo),
        updated_at = now()
      FROM rows_to_update rtu
      WHERE spr.id = rtu.id
        AND (rtu.hash_atual IS DISTINCT FROM v_hash_novo);

      GET DIAGNOSTICS v_row_count = ROW_COUNT;
      v_atualizados := v_atualizados + v_row_count;

      IF NOT EXISTS (
        SELECT 1 FROM supplier_products_raw
        WHERE supplier_id = v_supplier_id
          AND (
            supplier_sku = v_sku
            OR supplier_sku = v_sku || 'P'
            OR supplier_sku LIKE v_sku || '-%'
            OR raw_data->>'referencia' = v_sku
          )
      ) THEN
        v_nao_encontrados := v_nao_encontrados + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_erros := v_erros + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'atualizados',     v_atualizados,
    'nao_encontrados', v_nao_encontrados,
    'erros',           v_erros,
    'total_input',     jsonb_array_length(p_produtos)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_ingest_asia_hg_batch(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_ingest_asia_hg_batch(jsonb) TO service_role;
COMMENT ON FUNCTION public.fn_ingest_asia_hg_batch(jsonb) IS
  'F3: Merge campos hg/products em site_data do Bronze. Hash guard. Multi-grain match.';

-- ============================================================
-- fn_sync_asia_colors
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_sync_asia_colors(
  p_cores jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supplier_id uuid := 'd2734e23-d633-4819-bb15-e51aa44e2118';
  v_org_id      uuid;
  v_inseridos   int  := 0;
  v_atualizados int  := 0;
  v_cor         jsonb;
  v_row_count   int;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM supplier_colors WHERE supplier_id = v_supplier_id LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'organization_id não encontrado para Asia Import';
  END IF;

  FOR v_cor IN SELECT * FROM jsonb_array_elements(p_cores)
  LOOP
    BEGIN
      INSERT INTO supplier_colors (
        supplier_id, organization_id, name, code,
        hex_code, api_color_id, image_url, source,
        is_active, is_available, api_raw_data, updated_at
      ) VALUES (
        v_supplier_id, v_org_id,
        v_cor->>'name',
        v_cor->>'slug',
        NULLIF(trim(v_cor->>'color'), ''),
        v_cor->>'id',
        NULLIF(trim(v_cor->>'photo'), ''),
        'api_hg_atributes',
        true, true, v_cor, now()
      )
      ON CONFLICT (organization_id, supplier_id, name)
      DO UPDATE SET
        code         = EXCLUDED.code,
        hex_code     = COALESCE(EXCLUDED.hex_code, supplier_colors.hex_code),
        api_color_id = COALESCE(EXCLUDED.api_color_id, supplier_colors.api_color_id),
        image_url    = COALESCE(EXCLUDED.image_url, supplier_colors.image_url),
        source       = 'api_hg_atributes',
        api_raw_data = EXCLUDED.api_raw_data,
        is_active    = true,
        updated_at   = now();

      GET DIAGNOSTICS v_row_count = ROW_COUNT;
      -- v_row_count = 1 sempre (INSERT ou UPDATE)
      -- Usa xmax para distinguir: não disponível aqui, usa contagem simples
      v_atualizados := v_atualizados + v_row_count;

    EXCEPTION WHEN OTHERS THEN
      NULL; -- continua com as demais cores
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'processadas', v_atualizados,
    'total_input', jsonb_array_length(p_cores)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_sync_asia_colors(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_sync_asia_colors(jsonb) TO service_role;
COMMENT ON FUNCTION public.fn_sync_asia_colors(jsonb) IS
  'C4: UPSERT 51 cores canônicas do hg/atributes em supplier_colors. Enriquece api_color_id, slug, hex, photo.';
;
