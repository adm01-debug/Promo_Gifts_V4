CREATE OR REPLACE FUNCTION public.fn_ingest_asia_product(p_prod jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_ASIA   uuid := 'd2734e23-d633-4819-bb15-e51aa44e2118';
  v_parent text := p_prod->>'referencia';
  v_var    jsonb;
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

  -- Normaliza propriedades: aceita OBJETO {slug:valor} OU ARRAY [{slug,nome,valor}].
  -- DISTINCT ON (slug) mantém a 1a ocorrência (resolve slug duplicado, ex. dimensao-do-produto fechado/aberto).
  IF jsonb_typeof(p_prod->'propriedades') = 'array' THEN
    SELECT COALESCE(jsonb_object_agg(slug, valor), '{}'::jsonb) INTO v_props
    FROM (
      SELECT DISTINCT ON (e->>'slug') e->>'slug' AS slug, COALESCE(e->>'valor', e->>'value') AS valor
      FROM jsonb_array_elements(p_prod->'propriedades') WITH ORDINALITY AS x(e, ord)
      WHERE NULLIF(e->>'slug','') IS NOT NULL
      ORDER BY e->>'slug', ord
    ) d;
  ELSIF jsonb_typeof(p_prod->'propriedades') = 'object' THEN
    v_props := p_prod->'propriedades';
  ELSE
    v_props := '{}'::jsonb;
  END IF;

  FOR v_var IN SELECT * FROM jsonb_array_elements(p_prod->'variacoes')
  LOOP
    v_var_ref := v_var->>'referencia';
    CONTINUE WHEN v_var_ref IS NULL OR TRIM(v_var_ref) = '';
    v_vars := v_vars + 1;

    v_content := jsonb_strip_nulls(jsonb_build_object(
      'referencia',         v_parent,
      'var_referencia',     v_var_ref,
      'nome',               p_prod->>'nome',
      'descricao',          p_prod->>'descricao',
      'preco',              v_var->>'preco',
      'imagem',             COALESCE(v_var->>'imagem', p_prod->>'imagem'),
      'galeria',            COALESCE(p_prod->'galeria', '[]'::jsonb),
      'video',              p_prod->>'video',
      'ncm',                COALESCE(v_var->>'ncm', v_props->>'ncm'),
      'altura',             p_prod->>'altura',
      'largura',            p_prod->>'largura',
      'comprimento',        p_prod->>'comprimento',
      'peso',               p_prod->>'peso',
      'status',             p_prod->>'status',
      'promocao',           p_prod->>'promocao',
      'origem_faturamento', p_prod->>'origem_faturamento',
      'propriedades',       v_props,
      'categorias',         COALESCE(p_prod->'categorias', '{}'::jsonb),
      'tags',               COALESCE(p_prod->'tags', '{}'::jsonb),
      'atributos',          COALESCE(v_var->'atributos', '{}'::jsonb),
      'var_cor_nome',       COALESCE(v_var->'atributos'->'cor'->>'value', v_var->'atributos'->'cor'->>'valor', v_var->>'cor'),
      'var_cor_hex',        COALESCE(v_var->'atributos'->'cor'->>'hexadecimal', v_var->'atributos'->'cor'->>'hex', v_var->>'cor_hex')
    ));

    v_stock := jsonb_build_object(
      'qtd_estoque',       COALESCE(public.fn_safe_int(v_var->>'qtd_estoque'), 0),
      'qtd_estoque_em_sp', COALESCE(public.fn_safe_int(v_var->>'qtd_estoque_em_sp'), 0),
      'previsao_entrega',  COALESCE(v_var->'previsao_entrega', '[]'::jsonb)
    );

    v_chash := encode(digest(v_content::text, 'sha256'), 'hex');
    v_shash := encode(digest(v_stock::text,   'sha256'), 'hex');

    INSERT INTO public.supplier_products_raw AS spr (
      supplier_id, supplier_reference, supplier_sku, raw_data,
      stock_data, stock_hash, stock_status, stock_synced_at,
      source_channel, source_endpoint, status, images_status
    ) VALUES (
      v_ASIA, v_var_ref, v_var_ref, v_content,
      v_stock, v_shash, 'pending'::supplier_raw_status, now(),
      'n8n', 'listarProdutos2', 'pending'::supplier_raw_status, 'pending'::supplier_raw_status
    )
    ON CONFLICT (supplier_id, supplier_sku) DO UPDATE SET
      raw_data           = EXCLUDED.raw_data,
      supplier_reference = EXCLUDED.supplier_reference,
      status             = CASE WHEN spr.content_hash IS DISTINCT FROM v_chash
                                THEN 'pending'::supplier_raw_status ELSE spr.status END,
      stock_data         = EXCLUDED.stock_data,
      stock_hash         = EXCLUDED.stock_hash,
      stock_status       = CASE WHEN spr.stock_hash IS DISTINCT FROM EXCLUDED.stock_hash
                                THEN 'pending'::supplier_raw_status ELSE spr.stock_status END,
      stock_synced_at    = now(),
      source_channel     = EXCLUDED.source_channel,
      source_endpoint    = EXCLUDED.source_endpoint;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'parent', v_parent, 'variacoes', v_vars);
END;
$function$;;
