CREATE OR REPLACE FUNCTION public.fn_asia_wp_to_canonical(p_wp jsonb)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
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
$function$
