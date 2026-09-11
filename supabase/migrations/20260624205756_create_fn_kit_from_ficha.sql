CREATE OR REPLACE FUNCTION public.fn_kit_from_ficha(p_sku text, p_dry boolean DEFAULT true)
RETURNS TABLE(acao text, slot text, nome text, tipo text, a int, l int, p int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
DECLARE
  v_kid uuid; v_ic text; v_ncomp int; r record; v_kidx int:=0; v_eidx int:=0;
  v_kind text; v_type text; v_a int; v_l int; v_pp int; v_tgt uuid; v_nm text; v_slot text; v_npieces int;
BEGIN
  SELECT id INTO v_kid FROM products WHERE sku=p_sku;
  IF v_kid IS NULL THEN RAISE EXCEPTION 'produto % nao encontrado', p_sku; END IF;
  SELECT count(*) INTO v_ncomp FROM product_kit_components WHERE kit_product_id=v_kid;
  IF v_ncomp>0 THEN RAISE EXCEPTION 'produto % ja tem % componentes', p_sku, v_ncomp; END IF;
  SELECT count(*) INTO v_npieces FROM kit_component_ficha_staging s
   WHERE s.product_sku=p_sku AND s.piece_label NOT LIKE '\_\_%' AND s.match_status IN ('no_component','ambiguous','pending');
  IF v_npieces<2 THEN RAISE EXCEPTION 'produto % tem so % pecas (<2)', p_sku, v_npieces; END IF;

  SELECT cv.internal_code INTO v_ic FROM product_variants v JOIN color_variations cv ON cv.id=v.color_id
   WHERE v.product_id=v_kid AND cv.internal_code IS NOT NULL AND cv.internal_code<>'' ORDER BY v.id LIMIT 1;

  IF NOT p_dry THEN UPDATE products SET is_kit=true WHERE id=v_kid AND is_kit=false; END IF;

  FOR r IN
    SELECT s.id sid, s.piece_label, s.source_url, s.dim_a_mm, s.dim_l_mm, s.dim_p_mm, fn_norm_piece_label(s.piece_label) pnorm
    FROM kit_component_ficha_staging s
    WHERE s.product_sku=p_sku AND s.piece_label NOT LIKE '\_\_%' AND s.match_status IN ('no_component','ambiguous','pending')
    ORDER BY (CASE WHEN fn_norm_piece_label(s.piece_label) ~ '(maleta|estojo|necessaire|pouch|bolsa|sacola|caixa)' THEN 1 ELSE 0 END), s.id
  LOOP
    v_kind := CASE WHEN r.pnorm ~ '(maleta|estojo|necessaire|pouch|bolsa|sacola|caixa)' THEN 'packaging' ELSE 'item' END;
    v_type := CASE
      WHEN r.pnorm ~ 'faca' THEN 'FACA' WHEN r.pnorm ~ 'tabua' THEN 'TABUA'
      WHEN r.pnorm ~ 'garfo' THEN 'GARFO' WHEN r.pnorm ~ 'espatula' THEN 'ESPATULA'
      WHEN r.pnorm ~ '(colher|concha|escumadeira)' THEN 'COLHER' WHEN r.pnorm ~ 'pegador' THEN 'PEGADOR'
      WHEN r.pnorm ~ 'pincel' THEN 'PINCEL' WHEN r.pnorm ~ '(caderno|caderneta)' THEN 'CADERNO'
      WHEN r.pnorm ~ 'caneta' THEN 'CANETA' WHEN r.pnorm ~ 'copo' THEN 'COPO'
      WHEN r.pnorm ~ 'caneca' THEN 'CANECA' WHEN r.pnorm ~ 'garrafa' THEN 'GARRAFA'
      WHEN r.pnorm ~ 'chaveiro' THEN 'CHAVEIRO' WHEN r.pnorm ~ 'porta ?cart' THEN 'PORTA_CARTAO'
      WHEN r.pnorm ~ 'tesoura' THEN 'TESOURA' WHEN r.pnorm ~ 'canudo' THEN 'CANUDO'
      WHEN r.pnorm ~ 'frasco' THEN 'FRASCO' WHEN r.pnorm ~ 'pote' THEN 'POTE'
      WHEN r.pnorm ~ 'bandeja' THEN 'BANDEJA' WHEN r.pnorm ~ 'squeeze' THEN 'SQUEEZE'
      WHEN r.pnorm ~ 'coquetel' THEN 'COQUETELEIRA' WHEN r.pnorm ~ 'saca.?rolha' THEN 'SACA_ROLHAS'
      WHEN r.pnorm ~ 'dosador' THEN 'BICO_DOSADOR' WHEN r.pnorm ~ 'socador' THEN 'SOCADOR'
      WHEN r.pnorm ~ 'escova' THEN 'ESCOVA' WHEN r.pnorm ~ 'xicara' THEN 'XICARA'
      WHEN r.pnorm ~ 'pires' THEN 'PIRES' WHEN r.pnorm ~ '(taca|taça)' THEN 'TACA_VINHO'
      WHEN r.pnorm ~ 'chaira' THEN 'CHAIRA' WHEN r.pnorm ~ 'avental' THEN 'AVENTAL'
      WHEN r.pnorm ~ 'necessaire' THEN 'NECESSAIRE' WHEN r.pnorm ~ 'fone' THEN 'FONE'
      WHEN r.pnorm ~ 'mochila' THEN 'MOCHILA' WHEN r.pnorm ~ 'caixa' THEN 'CAIXA'
      WHEN r.pnorm ~ 'anel' THEN 'ANEL_SALVA_GOTAS' WHEN r.pnorm ~ 'tampa' THEN 'TAMPA'
      WHEN r.pnorm ~ 'taca' THEN 'TACA_VINHO' WHEN r.pnorm ~ 'abridor' THEN 'SACA_ROLHAS'
      ELSE NULL END;
    v_a := CASE WHEN r.dim_a_mm BETWEEN 1 AND 1500 THEN r.dim_a_mm END;
    v_l := CASE WHEN r.dim_l_mm BETWEEN 1 AND 1500 THEN r.dim_l_mm END;
    v_pp := CASE WHEN r.dim_p_mm BETWEEN 1 AND 1500 THEN r.dim_p_mm END;
    v_nm := left(initcap(r.piece_label), 80);

    IF v_kind='item' THEN v_kidx:=v_kidx+1; v_slot:='K'||v_kidx; acao:='INSERT item';
    ELSE v_eidx:=v_eidx+1; v_slot:='E'||v_eidx; acao:='INSERT pkg'; END IF;

    IF NOT p_dry THEN
      IF v_kind='item' THEN
        INSERT INTO product_kit_components(kit_product_id,component_name,component_type_code,slot_code,component_code,component_sku,
          is_packaging,quantity,is_standalone_sellable,height_mm,width_mm,length_mm,dim_source,dim_source_url)
        VALUES (v_kid,v_nm,v_type,v_slot,p_sku||'-'||v_slot, CASE WHEN v_ic IS NOT NULL THEN p_sku||'-'||v_ic||'-'||v_slot END,
                false,1,false,v_a,v_l,v_pp,'ficha',r.source_url) RETURNING id INTO v_tgt;
      ELSE
        INSERT INTO product_kit_components(kit_product_id,component_name,component_type_code,slot_code,component_code,component_sku,
          is_packaging,quantity,is_standalone_sellable,pkg_ext_height_mm,pkg_ext_width_mm,pkg_ext_length_mm,dim_source,dim_source_url)
        VALUES (v_kid,v_nm,coalesce(v_type,'CAIXA'),v_slot,p_sku||'-'||v_slot, CASE WHEN v_ic IS NOT NULL THEN p_sku||'-'||v_ic||'-'||v_slot END,
                true,1,false,v_a,v_l,v_pp,'ficha',r.source_url) RETURNING id INTO v_tgt;
      END IF;
      UPDATE kit_component_ficha_staging SET match_status='promoted', matched_component_id=v_tgt, product_id=v_kid,
             piece_kind=v_kind, piece_norm=r.pnorm, match_confidence=1.0, promoted_at=now(), notes='kit_from_ficha' WHERE id=r.sid;
    END IF;

    slot:=v_slot; tipo:=v_type; nome:=v_nm; a:=v_a; l:=v_l; p:=v_pp; RETURN NEXT;
  END LOOP;
END $$;;
