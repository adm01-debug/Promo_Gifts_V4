CREATE OR REPLACE FUNCTION public.fn_parse_xbz_site_html(p_html text, p_codigo text, p_url text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_idint text; v_nome text; v_desc text; v_modo text; v_grav text; v_main text;
  v_b64 text; v_video text; v_vid text;
  v_imgs jsonb; v_cores jsonb; v_cats jsonb; v_rel jsonb;
BEGIN
  p_html := regexp_replace(replace(p_html,'&amp;','&'), '&#160;|&nbsp;', ' ', 'g');
  v_main := split_part(p_html, 'Produtos relacionados', 1);   -- trecho do produto (antes dos relacionados)

  v_idint := substring(p_html from 'getPdfProduto/([0-9]+)');
  v_nome  := btrim(coalesce(substring(p_html from '<title>(?:Brinde )?([^<]+)</title>'),''));
  v_desc  := btrim(coalesce(substring(p_html from 'desc-sub my-desc-sub">([^<]{10,})'),''));
  v_modo  := btrim(coalesce(substring(p_html from 'Modo de uso[^A-Za-z0-9]{0,40}([^<]{20,})'),''));
  v_grav  := btrim(coalesce(substring(p_html from 'Medidas aproximadas para gravação[^0-9]{0,55}([0-9][^<]{2,80})'),''));

  v_b64 := substring(p_html from 'id="thumbvideo"[^>]*?data-src="([^"]+)"');
  IF v_b64 IS NOT NULL AND length(v_b64) > 8 THEN
    BEGIN
      v_video := convert_from(decode(v_b64,'base64'),'UTF8');
      v_vid   := substring(v_video from 'embed/([A-Za-z0-9_-]{6,20})');
    EXCEPTION WHEN OTHERS THEN v_video := NULL; v_vid := NULL; END;
  END IF;

  SELECT jsonb_agg(DISTINCT jsonb_build_object(
           'nome', m[1], 'swatch_url','https://www.xbzbrindes.com.br/img/cores/'||m[1]||'.jpg'))
    INTO v_cores FROM regexp_matches(p_html,'img/cores/([A-Z]+)\.jpg','g') m;

  -- GALERIA: imagens /img/produtos/ que aparecem ANTES da secao de relacionados, em ordem, sem duplicar
  SELECT jsonb_agg(jsonb_build_object(
           'url_origem','https://www.xbzbrindes.com.br/'||u,
           'ordem', rn-1,
           'tipo', CASE WHEN rn=1 THEN 'principal' ELSE 'galeria' END) ORDER BY rn)
    INTO v_imgs
  FROM (
    SELECT u, row_number() OVER (ORDER BY mo) AS rn
    FROM (
      SELECT t.m[1] AS u, min(t.o) AS mo
      FROM regexp_matches(v_main,'(img/produtos/[0-9]+/[^"'' )]+\.jpg)','g') WITH ORDINALITY AS t(m,o)
      GROUP BY t.m[1]
    ) g
  ) r;

  SELECT jsonb_agg(c ORDER BY c->>'path') INTO v_cats FROM (
    SELECT DISTINCT jsonb_build_object(
             'nivel', (length(path)-length(replace(path,'/',''))) - 1,
             'path', path,
             'url','http://www.xbzbrindes.com.br'||path,
             'nome', initcap(replace(regexp_replace(path,'^.*/',''),'-',' '))) AS c
    FROM (
      SELECT m[1] AS path FROM regexp_matches(p_html,'(/brindes/[A-Za-z0-9-]+/[A-Za-z0-9-]+)','g') m
      UNION
      SELECT DISTINCT regexp_replace(m[1],'^(/brindes/[^/]+)/.*','\1')
        FROM regexp_matches(p_html,'(/brindes/[A-Za-z0-9-]+/[A-Za-z0-9-]+)','g') m
    ) p
  ) s;

  SELECT jsonb_agg(DISTINCT jsonb_build_object(
           'codigo', m[1], 'url','https://www.xbzbrindes.com.br/'||m[1]))
    INTO v_rel
    FROM regexp_matches(p_html,'href="https://www\.xbzbrindes\.com\.br/(-?[0-9]{4,6}[a-zA-Z]?)"','g') m
   WHERE m[1] <> p_codigo AND m[1] <> ('-'||p_codigo);

  RETURN jsonb_strip_nulls(jsonb_build_object(
    'codigo', p_codigo, 'url', p_url, 'id_interno_site', v_idint,
    'nome', nullif(v_nome,''), 'descricao', nullif(v_desc,''), 'modo_de_uso', nullif(v_modo,''),
    'dimensoes', jsonb_build_object(
      'altura_cm',         nullif(replace(coalesce(substring(p_html from 'Altura[^0-9]{0,45}([0-9]+[.,]?[0-9]*)'),''),',','.'),'')::numeric,
      'largura_cm',        nullif(replace(coalesce(substring(p_html from 'Largura[^0-9]{0,45}([0-9]+[.,]?[0-9]*)'),''),',','.'),'')::numeric,
      'circunferencia_cm', nullif(replace(coalesce(substring(p_html from 'Circunfer[^0-9]{0,45}([0-9]+[.,]?[0-9]*)'),''),',','.'),'')::numeric,
      'diametro_cm',       nullif(replace(coalesce(substring(p_html from 'Di.metro[^0-9]{0,45}([0-9]+[.,]?[0-9]*)'),''),',','.'),'')::numeric,
      'profundidade_cm',   nullif(replace(coalesce(substring(p_html from 'Profundidade[^0-9]{0,45}([0-9]+[.,]?[0-9]*)'),''),',','.'),'')::numeric
    ),
    'peso_g', nullif(coalesce(substring(p_html from 'Peso aproximado[^0-9]{0,55}([0-9]+)'),''),'')::int,
    'gravacao', jsonb_build_object(
      'medida_texto',   nullif(v_grav,''),
      'comprimento_cm', nullif(replace(coalesce(substring(v_grav from '^([0-9]+[.,]?[0-9]*)'),''),',','.'),'')::numeric,
      'largura_cm',     nullif(replace(coalesce(substring(v_grav from '[xX]\s*([0-9]+[.,]?[0-9]*)'),''),',','.'),'')::numeric,
      'local',          nullif(btrim(coalesce(substring(v_grav from '\(([^)]+)\)'),'')),'')
    ),
    'cores', coalesce(v_cores,'[]'::jsonb),
    'imagens', coalesce(v_imgs,'[]'::jsonb),
    'video', CASE WHEN v_vid IS NOT NULL
       THEN jsonb_build_object('indicador',true,'plataforma','youtube','embed_id',v_vid,'embed_url',v_video,'watch_url','https://www.youtube.com/watch?v='||v_vid)
       ELSE jsonb_build_object('indicador',(p_html ~ 'thumbvideo')) END,
    'ficha_tecnica_pdf', CASE WHEN v_idint IS NOT NULL THEN 'https://www.xbzbrindes.com.br/getPdfProduto/'||v_idint END,
    'categorias', coalesce(v_cats,'[]'::jsonb),
    'relacionados', coalesce(v_rel,'[]'::jsonb),
    '_meta', jsonb_build_object('scraper_version','2.2-html','render','headless (r.jina.ai)','fonte','parser generico HTML')
  ));
END;
$function$
