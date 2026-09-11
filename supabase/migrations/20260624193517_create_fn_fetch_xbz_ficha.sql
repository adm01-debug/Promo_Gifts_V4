CREATE OR REPLACE FUNCTION public.fn_fetch_xbz_ficha(p_product_sku text, p_force boolean DEFAULT false)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
DECLARE v_url text; v_pdf text; v_md text; v_status int; v_n int:=0;
BEGIN
  SELECT spr.site_data->>'url', spr.site_data->>'ficha_tecnica_pdf'
    INTO v_url, v_pdf
  FROM supplier_products_raw spr JOIN products p ON p.id=spr.product_id
  WHERE p.sku=p_product_sku AND spr.supplier_id='d6718a29-e954-4c1b-bd84-03ea24884900'
    AND spr.site_data ? 'url'
  ORDER BY spr.site_scraped_at DESC NULLS LAST LIMIT 1;
  IF v_url IS NULL THEN RETURN -1; END IF;

  IF (NOT p_force) AND EXISTS(SELECT 1 FROM kit_component_ficha_staging
         WHERE product_sku=p_product_sku AND source='xbz_site_jina') THEN
    RETURN -2;
  END IF;

  PERFORM extensions.http_set_curlopt('CURLOPT_TIMEOUT','40');
  BEGIN
    SELECT status, content INTO v_status, v_md FROM extensions.http_get('https://r.jina.ai/' || v_url);
  EXCEPTION WHEN OTHERS THEN
    RETURN -3;
  END;
  IF v_status<>200 OR v_md IS NULL THEN RETURN -(1000+coalesce(v_status,0)); END IF;

  v_n := fn_parse_ficha_tecnica_text(p_product_sku, v_md, coalesce(v_pdf,v_url), 'xbz_site_jina');
  RETURN v_n;
END $$;;
