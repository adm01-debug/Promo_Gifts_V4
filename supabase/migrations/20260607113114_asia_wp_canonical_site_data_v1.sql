-- =====================================================================
-- ASIA F2 — Conforma o site_data WooCommerce ao contrato canônico do
-- subsistema genérico de site (lido por fn_site_to_silver_all).
-- 1) Helper puro WP->canônico (IMMUTABLE)
-- 2) Reescreve fn_upsert_asia_wp_batch para emitir o canônico + processed
-- =====================================================================

CREATE OR REPLACE FUNCTION public.fn_asia_wp_to_canonical(p_wp jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $fn$
  SELECT jsonb_strip_nulls(jsonb_build_object(
    'codigo',               p_wp->>'sku',
    'id_interno_site',      p_wp->>'id',
    'url',                  p_wp->>'permalink',
    'nome',                 p_wp->>'name',
    'descricao',            p_wp->>'description',
    'disponibilidade_site', p_wp#>>'{stock_availability,text}',
    'peso_g',               CASE WHEN NULLIF(p_wp->>'weight','') IS NOT NULL
                                 THEN round((p_wp->>'weight')::numeric*1000)::int END,
    'dimensoes', jsonb_strip_nulls(jsonb_build_object(
        'altura_cm',       NULLIF(p_wp#>>'{dimensions,height}','')::numeric,
        'largura_cm',      NULLIF(p_wp#>>'{dimensions,width}','')::numeric,
        'profundidade_cm', NULLIF(p_wp#>>'{dimensions,length}','')::numeric)),
    'imagens', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                  'tipo', CASE WHEN ord=1 THEN 'principal' ELSE 'galeria' END,
                  'ordem', ord, 'url_origem', img->>'src',
                  'alt', NULLIF(img->>'alt','')) ORDER BY ord),'[]'::jsonb)
                FROM jsonb_array_elements(COALESCE(p_wp->'images','[]'::jsonb))
                     WITH ORDINALITY AS t(img,ord)),
    'cores', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id',term->>'id','nome',term->>'name','slug',term->>'slug')),'[]'::jsonb)
              FROM jsonb_array_elements(COALESCE(p_wp->'attributes','[]'::jsonb)) attr
              CROSS JOIN jsonb_array_elements(COALESCE(attr->'terms','[]'::jsonb)) term
              WHERE attr->>'taxonomy'='pa_cor'),
    'categorias', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                     'id',cat->>'id','nome',cat->>'name','slug',cat->>'slug','link',cat->>'link')),'[]'::jsonb)
                   FROM jsonb_array_elements(COALESCE(p_wp->'categories','[]'::jsonb)) cat),
    -- extensões de valor (WP-only)
    'preco_normal', CASE WHEN NULLIF(p_wp#>>'{prices,regular_price}','') IS NOT NULL
        THEN round((p_wp#>>'{prices,regular_price}')::numeric
                   /power(10::numeric,COALESCE(NULLIF(p_wp#>>'{prices,currency_minor_unit}','')::int,2)::numeric),2) END,
    'preco_promo', CASE WHEN NULLIF(p_wp#>>'{prices,sale_price}','') IS NOT NULL
        THEN round((p_wp#>>'{prices,sale_price}')::numeric
                   /power(10::numeric,COALESCE(NULLIF(p_wp#>>'{prices,currency_minor_unit}','')::int,2)::numeric),2) END,
    'em_promocao',    (p_wp->>'on_sale')::boolean,
    'moq',            NULLIF(p_wp#>>'{add_to_cart,multiple_of}','')::int,
    'qtd_minima',     NULLIF(p_wp#>>'{add_to_cart,minimum}','')::int,
    'qtd_maxima',     NULLIF(p_wp#>>'{add_to_cart,maximum}','')::int,
    'marca',          (SELECT b->>'name' FROM jsonb_array_elements(COALESCE(p_wp->'brands','[]'::jsonb)) b LIMIT 1),
    'avaliacao',      NULLIF(p_wp->>'average_rating','0')::numeric,
    'num_avaliacoes', NULLIF(p_wp->>'review_count','0')::int,
    '_meta', jsonb_build_object('scraper_version','wc_store_v1','fonte','woocommerce_store_api')
  ));
$fn$;

COMMENT ON FUNCTION public.fn_asia_wp_to_canonical(jsonb) IS
  'Mapeia 1 produto da WooCommerce Store API (s.asiaimport.com.br) para o shape canonico de site_data lido por fn_site_to_silver_all. Puro/IMMUTABLE.';

-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_upsert_asia_wp_batch(p_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_ASIA       uuid := 'd2734e23-d633-4819-bb15-e51aa44e2118';
  v_item       jsonb;
  v_parent_ref text;
  v_canon      jsonb;
  v_hash       text;
  v_rows       int;
  v_fetched    int := 0;
  v_updated    int := 0;
  v_parents    int := 0;
BEGIN
  IF jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'fn_upsert_asia_wp_batch: p_items deve ser array jsonb';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_fetched := v_fetched + 1;
    -- Store API: 'sku' = referencia do produto-pai (ex: "MC511P"),
    -- que casa com raw_data->>'referencia' em TODAS as variantes.
    v_parent_ref := NULLIF(TRIM(v_item->>'sku'), '');
    CONTINUE WHEN v_parent_ref IS NULL;

    v_canon := public.fn_asia_wp_to_canonical(v_item);   -- WP cru -> canonico (PT)
    v_hash  := encode(digest(v_canon::text, 'sha256'), 'hex');

    UPDATE public.supplier_products_raw r SET
      site_data       = v_canon,
      site_hash       = v_hash,
      site_source_url = v_canon->>'url',
      -- dado da Store API chega pronto: vai direto a 'processed' quando muda
      site_status     = CASE WHEN r.site_hash IS DISTINCT FROM v_hash
                             THEN 'processed'::supplier_raw_status
                             ELSE r.site_status END,
      site_scraped_at = now(),
      updated_at      = now()
    WHERE r.supplier_id = v_ASIA
      AND r.raw_data->>'referencia' = v_parent_ref;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_updated := v_updated + v_rows;
    IF v_rows > 0 THEN v_parents := v_parents + 1; END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'fetched',         v_fetched,
    'matched_parents', v_parents,
    'updated_rows',    v_updated,
    'rodado_em',       now()
  );
END;
$fn$;

COMMENT ON FUNCTION public.fn_upsert_asia_wp_batch(jsonb) IS
  'F2 ASIA: recebe array de produtos da WooCommerce Store API, converte p/ canonico via fn_asia_wp_to_canonical e grava na trilha site_* de supplier_products_raw (propaga ao grao pai->variantes). site_status->processed on change.';

REVOKE ALL ON FUNCTION public.fn_asia_wp_to_canonical(jsonb) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_upsert_asia_wp_batch(jsonb)  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_asia_wp_to_canonical(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_upsert_asia_wp_batch(jsonb)  TO service_role;;
