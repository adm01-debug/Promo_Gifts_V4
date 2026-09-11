-- Varre os produtos XBZ cujo site_data ja tenha a seçao de caracteristicas tecnicas
-- (chave configuravel; default 'caracteristicas_tecnicas') e parseia para a staging.
-- No-op enquanto a chave nao existir; pula produtos ja parseados desta fonte.
CREATE OR REPLACE FUNCTION public.fn_parse_xbz_ficha_site_batch(
  p_key text DEFAULT 'caracteristicas_tecnicas', p_limit int DEFAULT NULL)
RETURNS TABLE(produtos_processados int, linhas_extraidas int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record; v_prod int:=0; v_lin int:=0; v_n int;
BEGIN
  FOR r IN
    SELECT DISTINCT ON (p.sku) p.sku AS product_sku,
           spr.site_data->>p_key AS texto,
           coalesce(spr.site_data->>'ficha_tecnica_pdf', spr.site_data->>'url') AS src_url
    FROM supplier_products_raw spr
    JOIN products p ON p.id=spr.product_id
    WHERE spr.supplier_id='d6718a29-e954-4c1b-bd84-03ea24884900'
      AND spr.site_data ? p_key
      AND coalesce(spr.site_data->>p_key,'')<>''
      AND NOT EXISTS (SELECT 1 FROM kit_component_ficha_staging s
                       WHERE s.product_sku=p.sku AND s.source='xbz_site_caracteristicas')
    ORDER BY p.sku
    LIMIT p_limit
  LOOP
    v_n := fn_parse_ficha_tecnica_text(r.product_sku, r.texto, r.src_url, 'xbz_site_caracteristicas');
    IF v_n>0 THEN v_prod:=v_prod+1; v_lin:=v_lin+v_n; END IF;
  END LOOP;
  RETURN QUERY SELECT v_prod, v_lin;
END $$;;
