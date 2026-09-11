-- Busca usando a chave Jina do Vault (Bearer) + sentinela quando a ficha nao tem tabela por peca
CREATE OR REPLACE FUNCTION public.fn_fetch_xbz_ficha(p_product_sku text, p_force boolean DEFAULT false)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
DECLARE v_url text; v_pdf text; v_md text; v_status int; v_n int:=0; v_target text;
        v_key text; v_hdr extensions.http_header[]; v_got200 boolean:=false;
BEGIN
  SELECT spr.site_data->>'url', spr.site_data->>'ficha_tecnica_pdf' INTO v_url, v_pdf
  FROM supplier_products_raw spr JOIN products p ON p.id=spr.product_id
  WHERE p.sku=p_product_sku AND spr.supplier_id='d6718a29-e954-4c1b-bd84-03ea24884900' AND spr.site_data ? 'url'
  ORDER BY spr.site_scraped_at DESC NULLS LAST LIMIT 1;
  IF v_url IS NULL AND v_pdf IS NULL THEN RETURN -1; END IF;
  IF (NOT p_force) AND EXISTS(SELECT 1 FROM kit_component_ficha_staging
        WHERE product_sku=p_product_sku AND source ILIKE 'xbz_%jina') THEN RETURN -2; END IF;

  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name='jina_api_key' LIMIT 1;
  v_hdr := CASE WHEN v_key IS NOT NULL THEN ARRAY[extensions.http_header('Authorization','Bearer '||v_key)] END;

  PERFORM extensions.http_set_curlopt('CURLOPT_TIMEOUT','45');
  v_target := coalesce(v_pdf, v_url);
  BEGIN
    SELECT status, content INTO v_status, v_md
    FROM extensions.http(('GET','https://r.jina.ai/'||v_target, v_hdr, NULL, NULL)::extensions.http_request);
  EXCEPTION WHEN OTHERS THEN v_status:=0; END;
  IF v_status=200 AND v_md IS NOT NULL THEN
    v_got200:=true;
    v_n := fn_parse_ficha_tecnica_text(p_product_sku, v_md, v_target,
             CASE WHEN v_pdf IS NOT NULL THEN 'xbz_ficha_pdf_jina' ELSE 'xbz_site_jina' END);
  END IF;

  IF v_n=0 AND v_pdf IS NOT NULL AND v_url IS NOT NULL THEN
    BEGIN
      SELECT status, content INTO v_status, v_md
      FROM extensions.http(('GET','https://r.jina.ai/'||v_url, v_hdr, NULL, NULL)::extensions.http_request);
    EXCEPTION WHEN OTHERS THEN v_status:=0; END;
    IF v_status=200 AND v_md IS NOT NULL THEN
      v_got200:=true;
      v_n := fn_parse_ficha_tecnica_text(p_product_sku, v_md, v_url, 'xbz_site_jina');
    END IF;
  END IF;

  -- sentinela: buscou OK mas ficha nao tem tabela por peca -> nao re-buscar
  IF v_got200 AND v_n=0 THEN
    INSERT INTO kit_component_ficha_staging(product_sku, piece_label, source, source_url, match_status, notes)
    VALUES (p_product_sku, '__sem_medidas_por_peca__', 'xbz_ficha_pdf_jina', v_target, 'skipped', 'ficha sem tabela por peca');
  END IF;
  IF NOT v_got200 THEN RETURN -3; END IF;   -- falha de fetch (transitorio): permite retry
  RETURN v_n;
END $$;

-- Executor em lote: busca+promove N kits prioridade-1 ainda nao processados
CREATE OR REPLACE FUNCTION public.fn_xbz_ficha_run_batch(p_limit int DEFAULT 8)
RETURNS TABLE(sku text, extraidas int, promovidas int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
DECLARE r record; v_ext int; v_prom int;
BEGIN
  FOR r IN
    SELECT q.product_sku FROM v_xbz_ficha_parse_queue q
    WHERE q.prioridade=1
      AND NOT EXISTS(SELECT 1 FROM kit_component_ficha_staging s
                      WHERE s.product_sku=q.product_sku AND s.source ILIKE 'xbz_%jina')
    ORDER BY q.n_dim_heuristicas DESC, q.product_sku
    LIMIT p_limit
  LOOP
    v_ext := fn_fetch_xbz_ficha(r.product_sku, false);
    SELECT promoted INTO v_prom FROM fn_promote_kit_ficha_staging(r.product_sku);
    sku:=r.product_sku; extraidas:=coalesce(v_ext,0); promovidas:=coalesce(v_prom,0);
    RETURN NEXT;
  END LOOP;
END $$;;
