
CREATE OR REPLACE FUNCTION public.fn_standardize_variant(p_raw_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  r public.supplier_products_raw%ROWTYPE;
  v_parent text; v_code text; v_apiid text; v_cname text; v_chex text;
  v_col RECORD; v_sku text; v_supplier_sku text; v_stock integer; v_cost numeric; v_var_id uuid;
  v_fname text; v_fcode text; v_fhex text; v_canonical_id uuid;
  v_cp1 numeric; v_cp2 numeric; v_cp3 numeric; v_cp4 numeric; v_cp5 numeric;
  v_mq1 int; v_mq2 int; v_mq3 int; v_mq4 int; v_mq5 int;
  v_nq1 int; v_nq2 int; v_nq3 int; v_nd1 date; v_nd2 date; v_nd3 date;
  v_mult int; v_thumb text; v_images jsonb; v_videos jsonb;
  v_base text := 'https://www.spotgifts.com.br/fotos/produtos/';
  v_SPOT uuid := 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0';
  v_XBZ  uuid := 'd6718a29-e954-4c1b-bd84-03ea24884900';
  v_ASIA uuid := 'd2734e23-d633-4819-bb15-e51aa44e2118';
  v_SM   uuid := '841cd690-210a-422a-908c-7676828db272';
  -- Variáveis para o loop DE>PARA (SPOT)
  m            RECORD;
  v_val        text;
  v_tx         text;
  v_pv_assigns  jsonb := '{}'::jsonb;   -- acumulador product_variants
  v_vss_assigns jsonb := '{}'::jsonb;  -- acumulador variant_supplier_sources
BEGIN
  SELECT * INTO r FROM public.supplier_products_raw WHERE id=p_raw_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','raw_nao_encontrado'); END IF;
  v_parent := public.fn_derive_parent_ref(r.supplier_id, r.supplier_reference, r.raw_data);

  -- ═══════════════════════════════════════════════════════════════════════════
  -- SPOT: DE>PARA-driven (supplier_field_mappings) — 2026-06-06
  -- Substitui branch hardcoded por loop sobre 39 regras de variants/vss.
  -- Color matching e INSERT permanecem inalterados.
  -- ═══════════════════════════════════════════════════════════════════════════
  IF r.supplier_id=v_SPOT THEN
    v_pv_assigns  := '{}'::jsonb;
    v_vss_assigns := '{}'::jsonb;

    FOR m IN
      SELECT sfm.source_field, sfm.target_field, sfm.target_table,
             sfm.transform_type, sfm.transform_config, sfm.source_unit, sfm.target_unit
      FROM public.supplier_field_mappings sfm
      WHERE sfm.supplier_id = v_SPOT
        AND sfm.target_table IN ('product_variants','variant_supplier_sources')
        AND sfm.is_active = TRUE
        -- color_id e size_id: resolvidos por fn_match_canonical_color / lookup separado
        AND sfm.target_field NOT IN ('color_id','size_id','web_sku','length_cm','width_cm')
      ORDER BY sfm.target_table, sfm.priority NULLS LAST
    LOOP
      -- Fonte: raw_data ou stock_data (marcado em transform_config->>'source_blob')
      v_val := CASE WHEN m.transform_config->>'source_blob' = 'stock_data'
                    THEN r.stock_data ->> m.source_field
                    ELSE r.raw_data   ->> m.source_field
               END;
      CONTINUE WHEN v_val IS NULL OR TRIM(v_val) = '';

      BEGIN
        v_tx := public.fn_apply_transform(
          v_val, m.transform_type, m.transform_config,
          m.source_unit, m.target_unit, v_SPOT
        );
      EXCEPTION WHEN OTHERS THEN v_tx := v_val; END;
      CONTINUE WHEN v_tx IS NULL;

      IF m.target_table = 'product_variants' THEN
        v_pv_assigns := v_pv_assigns || jsonb_build_object(m.target_field, v_tx);
      ELSE
        v_vss_assigns := v_vss_assigns || jsonb_build_object(m.target_field, v_tx);
      END IF;
    END LOOP;

    -- Extrai valores tipados dos acumuladores
    v_supplier_sku := v_pv_assigns->>'supplier_sku';
    v_code  := v_pv_assigns->>'color_code';
    v_cname := COALESCE(NULLIF(TRIM(v_pv_assigns->>'color_name'),''), r.raw_data->>'ColorDesc1');
    v_chex  := COALESCE(NULLIF(TRIM(v_pv_assigns->>'color_hex'),''),  r.raw_data->>'ColorHex1');
    v_thumb := COALESCE(v_pv_assigns->>'selected_thumbnail', v_vss_assigns->>'supplier_thumbnail');
    v_sku   := r.supplier_reference;  -- SKU local SPOT = supplier_reference

    -- Imagens: fn_spot_image_list retorna jsonb serializada como text
    BEGIN
      v_images := COALESCE(
        CASE WHEN v_pv_assigns ? 'images'
             THEN (v_pv_assigns->>'images')::jsonb END,
        CASE WHEN v_vss_assigns ? 'supplier_images'
             THEN (v_vss_assigns->>'supplier_images')::jsonb END,
        '[]'::jsonb
      );
    EXCEPTION WHEN OTHERS THEN v_images := '[]'::jsonb; END;

    -- Vídeos (array_url op → jsonb serializada)
    BEGIN
      v_videos := CASE WHEN v_vss_assigns ? 'supplier_videos'
                       THEN (v_vss_assigns->>'supplier_videos')::jsonb END;
    EXCEPTION WHEN OTHERS THEN v_videos := NULL; END;

    -- Estoque (com fallback para campos legados)
    v_stock := public.fn_safe_int(COALESCE(
      v_vss_assigns->>'quantity',
      v_vss_assigns->>'stock_main_warehouse',
      r.stock_data->>'Quantity',
      r.raw_data->>'StockQuantity'
    ));

    -- Custo e preços (5 faixas)
    v_cost := public.fn_safe_num(COALESCE(v_vss_assigns->>'cost_price', r.raw_data->>'Price1'));
    v_cp1  := public.fn_safe_num(COALESCE(v_vss_assigns->>'cost_price_1', r.raw_data->>'Price1'));
    v_cp2  := public.fn_safe_num(v_vss_assigns->>'cost_price_2');
    v_cp3  := public.fn_safe_num(v_vss_assigns->>'cost_price_3');
    v_cp4  := public.fn_safe_num(v_vss_assigns->>'cost_price_4');
    v_cp5  := public.fn_safe_num(v_vss_assigns->>'cost_price_5');

    -- MOQ (quantidades mínimas por faixa)
    v_mq1 := public.fn_safe_int(v_vss_assigns->>'min_qty_1');
    v_mq2 := public.fn_safe_int(v_vss_assigns->>'min_qty_2');
    v_mq3 := public.fn_safe_int(v_vss_assigns->>'min_qty_3');
    v_mq4 := public.fn_safe_int(v_vss_assigns->>'min_qty_4');
    v_mq5 := public.fn_safe_int(v_vss_assigns->>'min_qty_5');

    -- Multiplicador de venda
    v_mult := public.fn_safe_int(COALESCE(v_vss_assigns->>'sale_multiplier', r.raw_data->>'Multiplier'));

    -- Reposição (lotes 1-3 via DE>PARA; lotes 4-6 via fn_spot_variant_repl_enrich)
    v_nq1 := public.fn_safe_int(v_vss_assigns->>'next_quantity_1');
    v_nq2 := public.fn_safe_int(v_vss_assigns->>'next_quantity_2');
    v_nq3 := public.fn_safe_int(v_vss_assigns->>'next_quantity_3');
    v_nd1 := CASE WHEN v_vss_assigns->>'next_date_1' ~ '^\d{4}-\d{2}-\d{2}'
                  THEN LEFT(v_vss_assigns->>'next_date_1', 10)::date ELSE NULL END;
    v_nd2 := CASE WHEN v_vss_assigns->>'next_date_2' ~ '^\d{4}-\d{2}-\d{2}'
                  THEN LEFT(v_vss_assigns->>'next_date_2', 10)::date ELSE NULL END;
    v_nd3 := CASE WHEN v_vss_assigns->>'next_date_3' ~ '^\d{4}-\d{2}-\d{2}'
                  THEN LEFT(v_vss_assigns->>'next_date_3', 10)::date ELSE NULL END;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- XBZ, ASIA, SM: branches hardcoded (DE>PARA a implementar futuramente)
  -- ═══════════════════════════════════════════════════════════════════════════
  ELSIF r.supplier_id=v_XBZ THEN
    v_apiid:=r.raw_data->>'CorWebPrincipalId'; v_cname:=r.raw_data->>'CorWebPrincipal';
    v_supplier_sku:=r.raw_data->>'CodigoComposto'; v_stock:=public.fn_safe_int(r.raw_data->>'QuantidadeDisponivel');
    v_cost:=public.fn_safe_num(r.raw_data->>'PrecoVenda');
    v_sku:='XBZ-'||r.supplier_reference;
  ELSIF r.supplier_id=v_ASIA THEN
    v_cname:=r.raw_data->>'var_cor_nome'; v_chex:=r.raw_data->>'var_cor_hex';
    v_supplier_sku:=COALESCE(r.raw_data->>'var_referencia', r.supplier_reference);
    v_stock:=public.fn_safe_int(COALESCE(r.stock_data->>'qtd_estoque', r.raw_data->>'var_estoque'));
    v_cost:=public.fn_safe_num(r.raw_data->>'preco');
    v_sku:='ASIA-'||r.supplier_reference;
    v_nd1 := CASE
      WHEN COALESCE(r.stock_data->'previsao_entrega'->0->>'data', r.raw_data->'previsao_entrega'->0->>'data') ~ '^\d{4}-\d{2}-\d{2}'
      THEN LEFT(COALESCE(r.stock_data->'previsao_entrega'->0->>'data', r.raw_data->'previsao_entrega'->0->>'data'),10)::date END;
    v_nq1 := public.fn_safe_int(COALESCE(r.stock_data->'previsao_entrega'->0->>'quantidade', r.raw_data->'previsao_entrega'->0->>'quantidade'));
  ELSIF r.supplier_id=v_SM THEN
    v_cname:=public.fn_extract_color_from_title(r.raw_data->>'titulo');
    v_chex := (SELECT split_part(item,'|',2)
               FROM unnest(string_to_array(r.raw_data->>'produtos_similares', ';')) item
               WHERE split_part(item,'|',1)=r.supplier_reference
                 AND split_part(item,'|',2) ~* '^#[0-9a-f]{6}$' LIMIT 1);
    v_supplier_sku:=r.supplier_reference;
    v_stock:=public.fn_safe_int(r.raw_data->>'estoque');
    v_cost:=public.fn_safe_num(r.raw_data->>'preco_sem_gravacao_sem_impostos');
    v_sku:=r.supplier_reference;
  ELSE
    v_cname:=r.raw_data->>'cor'; v_supplier_sku:=r.supplier_reference;
    v_stock:=public.fn_safe_int(r.raw_data->>'estoque'); v_cost:=public.fn_safe_num(r.raw_data->>'preco_base');
    v_sku:=r.supplier_reference;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- Color matching (comum a todos os fornecedores — inalterado)
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT * INTO v_col FROM public.fn_match_supplier_color(r.supplier_id, v_code, v_apiid, v_cname, v_chex);
  v_fname := COALESCE(v_col.color_name, v_cname);
  v_fcode := COALESCE(v_col.color_code, v_code);
  v_fhex  := COALESCE(v_col.color_hex,  v_chex);
  v_canonical_id := public.fn_match_canonical_color(v_fname, v_fhex);

  -- ═══════════════════════════════════════════════════════════════════════════
  -- INSERT/UPSERT em produtos_padronizacao_variantes (inalterado)
  -- ═══════════════════════════════════════════════════════════════════════════
  INSERT INTO public.produtos_padronizacao_variantes AS pv (
    raw_id, supplier_id, parent_reference, variant_reference,
    sku, supplier_sku, color_name, color_code, color_hex, color_id,
    stock_quantity, cost_price, is_active, status,
    cost_price_1, cost_price_2, cost_price_3, cost_price_4, cost_price_5,
    min_qty_1, min_qty_2, min_qty_3, min_qty_4, min_qty_5,
    next_quantity_1, next_quantity_2, next_quantity_3, next_date_1, next_date_2, next_date_3,
    sale_multiplier, supplier_thumbnail, supplier_images, supplier_videos
  ) VALUES (
    r.id, r.supplier_id, v_parent, r.supplier_reference, v_sku, v_supplier_sku,
    v_fname, v_fcode, v_fhex, v_canonical_id,
    v_stock, v_cost, true, 'standardized'::public.produtos_padronizacao_status,
    v_cp1, v_cp2, v_cp3, v_cp4, v_cp5,
    v_mq1, v_mq2, v_mq3, v_mq4, v_mq5,
    v_nq1, v_nq2, v_nq3, v_nd1, v_nd2, v_nd3,
    v_mult, v_thumb, v_images, v_videos
  )
  ON CONFLICT (supplier_id, variant_reference) DO UPDATE SET
    raw_id=EXCLUDED.raw_id, parent_reference=EXCLUDED.parent_reference, sku=EXCLUDED.sku, supplier_sku=EXCLUDED.supplier_sku,
    color_name=EXCLUDED.color_name, color_code=EXCLUDED.color_code, color_hex=EXCLUDED.color_hex, color_id=EXCLUDED.color_id,
    stock_quantity=EXCLUDED.stock_quantity, cost_price=EXCLUDED.cost_price, is_active=EXCLUDED.is_active,
    status=EXCLUDED.status,
    cost_price_1=EXCLUDED.cost_price_1, cost_price_2=EXCLUDED.cost_price_2, cost_price_3=EXCLUDED.cost_price_3,
    cost_price_4=EXCLUDED.cost_price_4, cost_price_5=EXCLUDED.cost_price_5,
    min_qty_1=EXCLUDED.min_qty_1, min_qty_2=EXCLUDED.min_qty_2, min_qty_3=EXCLUDED.min_qty_3,
    min_qty_4=EXCLUDED.min_qty_4, min_qty_5=EXCLUDED.min_qty_5,
    next_quantity_1=EXCLUDED.next_quantity_1, next_quantity_2=EXCLUDED.next_quantity_2, next_quantity_3=EXCLUDED.next_quantity_3,
    next_date_1=EXCLUDED.next_date_1, next_date_2=EXCLUDED.next_date_2, next_date_3=EXCLUDED.next_date_3,
    sale_multiplier=EXCLUDED.sale_multiplier, supplier_thumbnail=EXCLUDED.supplier_thumbnail,
    supplier_images=EXCLUDED.supplier_images, supplier_videos=EXCLUDED.supplier_videos,
    updated_at=now()
  RETURNING pv.id INTO v_var_id;

  RETURN jsonb_build_object('success',true,'variante_id',v_var_id,'parent',v_parent,
                            'cor',v_fname,'hex',v_fhex,'color_id_canonico',v_canonical_id,
                            'de_para_driven', (r.supplier_id=v_SPOT));
END;
$function$;
;
