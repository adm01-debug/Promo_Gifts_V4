CREATE OR REPLACE FUNCTION public.fn_fetch_xbz_ficha(p_product_sku text, p_force boolean DEFAULT false)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
DECLARE v_url text; v_pdf text; v_md text; v_status int; v_n int:=0; v_target text;
BEGIN
  SELECT spr.site_data->>'url', spr.site_data->>'ficha_tecnica_pdf'
    INTO v_url, v_pdf
  FROM supplier_products_raw spr JOIN products p ON p.id=spr.product_id
  WHERE p.sku=p_product_sku AND spr.supplier_id='d6718a29-e954-4c1b-bd84-03ea24884900'
    AND spr.site_data ? 'url'
  ORDER BY spr.site_scraped_at DESC NULLS LAST LIMIT 1;
  IF v_url IS NULL AND v_pdf IS NULL THEN RETURN -1; END IF;

  IF (NOT p_force) AND EXISTS(SELECT 1 FROM kit_component_ficha_staging
         WHERE product_sku=p_product_sku AND source ILIKE 'xbz_%jina') THEN
    RETURN -2;
  END IF;

  v_target := coalesce(v_pdf, v_url);   -- PDF primeiro (mais confiavel)
  PERFORM extensions.http_set_curlopt('CURLOPT_TIMEOUT','40');
  BEGIN
    SELECT status, content INTO v_status, v_md FROM extensions.http_get('https://r.jina.ai/' || v_target);
  EXCEPTION WHEN OTHERS THEN RETURN -3; END;
  IF v_status=200 AND v_md IS NOT NULL THEN
    v_n := fn_parse_ficha_tecnica_text(p_product_sku, v_md, v_target,
             CASE WHEN v_pdf IS NOT NULL THEN 'xbz_ficha_pdf_jina' ELSE 'xbz_site_jina' END);
  END IF;

  -- fallback: se PDF nao rendeu nada e existe pagina distinta, tenta a pagina
  IF v_n=0 AND v_pdf IS NOT NULL AND v_url IS NOT NULL THEN
    BEGIN
      SELECT status, content INTO v_status, v_md FROM extensions.http_get('https://r.jina.ai/' || v_url);
    EXCEPTION WHEN OTHERS THEN v_status:=0; END;
    IF v_status=200 AND v_md IS NOT NULL THEN
      v_n := fn_parse_ficha_tecnica_text(p_product_sku, v_md, v_url, 'xbz_site_jina');
    END IF;
  END IF;

  RETURN v_n;
END $$;;
