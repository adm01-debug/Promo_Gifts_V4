
-- Correção: content_hash é GENERATED COLUMN — removido de INSERT e UPDATE SET
CREATE OR REPLACE FUNCTION public.fn_ingest_asia_product(p_prod jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_ASIA    uuid := 'd2734e23-d633-4819-bb15-e51aa44e2118';
  v_parent  text := p_prod->>'referencia';
  v_var     jsonb;
  v_var_ref text;
  v_content jsonb;
  v_stock   jsonb;
  v_props   jsonb;
  v_chash   text;
  v_shash   text;
  v_vars    int := 0;
BEGIN
  IF v_parent IS NULL OR jsonb_typeof(p_prod->'variacoes') <> 'array' THEN
    RETURN jsonb_build_object('success', false, 'error', 'payload_invalido', 'parent', v_parent);
  END IF;

  -- Normaliza propriedades: OBJETO ou ARRAY de {slug, valor/value}
  IF jsonb_typeof(p_prod->'propriedades') = 'array' THEN
    SELECT COALESCE(jsonb_object_agg(slug, valor), '{}'::jsonb) INTO v_props
    FROM (
      SELECT DISTINCT ON (e->>'slug')
             e->>'slug' AS slug,
             COALESCE(e->>'valor', e->>'value') AS valor
      FROM jsonb_array_elements(p_prod->'propriedades') WITH ORDINALITY AS x(e, ord)
      WHERE NULLIF(e->>'slug', '') IS NOT NULL
      ORDER BY e->>'slug', ord
    ) d;
  ELSIF jsonb_typeof(p_prod->'propriedades') = 'object' THEN
    v_props := p_prod->'propriedades';
  ELSE
    v_props := '{}'::jsonb;
  END IF;

  FOR v_var IN SELECT * FROM jsonb_array_elements(p_prod->'variacoes')
  LOOP
    -- Canal 1 NOVO (asia.ajung.site): variações têm 'sku' (ex: CAD005-AZ)
    -- Canal 1 LEGADO: variações tinham 'referencia'
    v_var_ref := COALESCE(
      NULLIF(TRIM(v_var->>'sku'),        ''),
      NULLIF(TRIM(v_var->>'referencia'), '')
    );
    CONTINUE WHEN v_var_ref IS NULL;
    v_vars := v_vars + 1;

    v_content := jsonb_strip_nulls(jsonb_build_object(
      'referencia',          v_parent,
      'var_referencia',      v_var_ref,
      'nome',                p_prod->>'nome',
      'descricao',           p_prod->>'descricao',
      'preco',               v_var->>'preco',
      'imagem',              COALESCE(v_var->>'imagem', p_prod->>'imagem'),
      'galeria',             COALESCE(p_prod->'galeria', '[]'::jsonb),
      'video',               p_prod->>'video',
      'ncm',                 COALESCE(v_var->>'ncm', v_props->>'ncm', p_prod->>'ncm'),
      -- Dimensões: novo API usa objeto 'dimensoes_cm', legado usava campos soltos
      'altura',              COALESCE(p_prod->'dimensoes_cm'->>'altura',      p_prod->>'altura'),
      'largura',             COALESCE(p_prod->'dimensoes_cm'->>'largura',     p_prod->>'largura'),
      'comprimento',         COALESCE(p_prod->'dimensoes_cm'->>'comprimento', p_prod->>'comprimento'),
      -- Peso: novo API usa 'peso_kg', legado usava 'peso'
      'peso',                COALESCE(p_prod->>'peso_kg', p_prod->>'peso'),
      'status',              p_prod->>'status',
      'promocao',            p_prod->>'promocao',
      'origem_faturamento',  p_prod->>'origem_faturamento',
      'propriedades',        v_props,
      'categorias',          COALESCE(p_prod->'categorias', '{}'::jsonb),
      'tags',                COALESCE(p_prod->'tags',       '{}'::jsonb),
      'embalagem',           COALESCE(p_prod->'embalagem',  '{}'::jsonb),
      'atributos',           COALESCE(v_var->'atributos',   '{}'::jsonb),
      'var_cor_nome',        COALESCE(
                               v_var->'atributos'->'cor'->>'value',
                               v_var->'atributos'->'cor'->>'valor',
                               v_var->>'cor'
                             ),
      'var_cor_hex',         COALESCE(
                               v_var->'atributos'->'cor'->>'hexadecimal',
                               v_var->'atributos'->'cor'->>'hex',
                               v_var->>'cor_hex'
                             ),
      'var_capacidade',      v_var->>'capacidade',
      'var_volume',          v_var->>'volume'
    ));

    v_stock := jsonb_build_object(
      'qtd_estoque',       COALESCE(public.fn_safe_int(v_var->>'qtd_estoque'),       0),
      'qtd_estoque_em_sp', COALESCE(public.fn_safe_int(v_var->>'qtd_estoque_em_sp'), 0),
      'previsao_entrega',  COALESCE(v_var->'previsao_entrega', '[]'::jsonb)
    );

    -- content_hash é GENERATED COLUMN — NÃO inserir, o Postgres calcula automaticamente
    v_chash := encode(digest(v_content::text, 'sha256'), 'hex');
    v_shash := encode(digest(v_stock::text,   'sha256'), 'hex');

    INSERT INTO public.supplier_products_raw AS spr (
      supplier_id, supplier_reference, supplier_sku,
      raw_data,
      stock_data, stock_hash, stock_status, stock_synced_at,
      source_channel, source_endpoint,
      status, images_status
    ) VALUES (
      v_ASIA, v_var_ref, v_var_ref,
      v_content,
      v_stock, v_shash, 'pending'::supplier_raw_status, now(),
      'n8n_workflow', 'asia.ajung.site/api/products',
      'pending'::supplier_raw_status, 'pending'::supplier_raw_status
    )
    ON CONFLICT (supplier_id, supplier_sku) DO UPDATE SET
      raw_data           = EXCLUDED.raw_data,
      supplier_reference = EXCLUDED.supplier_reference,
      -- content_hash é GENERATED: atualiza automaticamente quando raw_data muda
      -- Status: pending só se conteúdo mudou (compara hash atual com novo esperado)
      status             = CASE WHEN spr.content_hash IS DISTINCT FROM v_chash
                                THEN 'pending'::supplier_raw_status
                                ELSE spr.status
                           END,
      stock_data         = EXCLUDED.stock_data,
      stock_hash         = EXCLUDED.stock_hash,
      stock_status       = CASE WHEN spr.stock_hash IS DISTINCT FROM EXCLUDED.stock_hash
                                THEN 'pending'::supplier_raw_status
                                ELSE spr.stock_status
                           END,
      stock_synced_at    = now(),
      source_channel     = EXCLUDED.source_channel,
      source_endpoint    = EXCLUDED.source_endpoint,
      updated_at         = now();
  END LOOP;

  RETURN jsonb_build_object('success', true, 'parent', v_parent, 'variacoes', v_vars);
END;
$function$;

-- ================================================================
-- fn_upsert_asia_wp_batch: Canal 3 (WP hg/products → site_data)
-- ================================================================
CREATE OR REPLACE FUNCTION public.fn_upsert_asia_wp_batch(p_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ASIA       uuid := 'd2734e23-d633-4819-bb15-e51aa44e2118';
  v_item       jsonb;
  v_parent_ref text;
  v_wp_data    jsonb;
  v_hash       text;
  v_rows       int;
  v_fetched    int := 0;
  v_updated    int := 0;
BEGIN
  IF jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'fn_upsert_asia_wp_batch: p_items deve ser array jsonb';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_fetched    := v_fetched + 1;
    -- Canal 3 WP hg/products: 'sku' = referência do produto-pai (ex: "CAD005")
    v_parent_ref := NULLIF(TRIM(v_item->>'sku'), '');
    CONTINUE WHEN v_parent_ref IS NULL;

    -- Remove 'variations' para não inflar site_data com dados repetidos por variante
    v_wp_data := v_item - 'variations';
    v_hash    := encode(digest(v_wp_data::text, 'sha256'), 'hex');

    -- Atualiza site_data em TODAS as variantes do produto-pai
    -- O raw_data->'referencia' grava a ref do pai (feito pelo fn_ingest_asia_product)
    UPDATE public.supplier_products_raw SET
      site_data       = v_wp_data,
      site_hash       = v_hash,
      site_status     = CASE
                          WHEN site_hash IS DISTINCT FROM v_hash
                          THEN 'pending'::supplier_raw_status
                          ELSE site_status
                        END,
      site_scraped_at = now(),
      updated_at      = now()
    WHERE supplier_id = v_ASIA
      AND raw_data->>'referencia' = v_parent_ref;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_updated := v_updated + v_rows;
  END LOOP;

  RETURN jsonb_build_object(
    'fetched',      v_fetched,
    'updated_rows', v_updated
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_upsert_asia_wp_batch(jsonb)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_upsert_asia_wp_batch(jsonb)
  TO service_role;
;
