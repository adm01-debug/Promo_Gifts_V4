CREATE OR REPLACE FUNCTION public.fn_decompose_kit_from_ficha(p_sku text, p_dry boolean DEFAULT true)
RETURNS TABLE(acao text, slot text, nome text, tipo text, a int, l int, p int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
DECLARE
  v_kid uuid; v_ph_id uuid; v_ph_slot text; v_ph_pkg boolean; v_ph_sku text; v_ic text; v_ncomp int; v_phnum int; v_legacy boolean:=false;
  r record; v_kidx int:=0; v_eidx int:=0; v_first_item boolean:=false; v_first_pkg boolean:=false;
  v_kind text; v_type text; v_code text; v_csku text; v_a int; v_l int; v_pp int; v_tgt uuid; v_nm text;
BEGIN
  SELECT id INTO v_kid FROM products WHERE sku=p_sku AND is_kit=true;
  IF v_kid IS NULL THEN RAISE EXCEPTION 'kit % nao encontrado', p_sku; END IF;
  SELECT count(*) INTO v_ncomp FROM product_kit_components WHERE kit_product_id=v_kid;
  IF v_ncomp<>1 THEN RAISE EXCEPTION 'kit % tem % componentes (esperado 1)', p_sku, v_ncomp; END IF;

  SELECT id, slot_code, is_packaging, component_sku INTO v_ph_id, v_ph_slot, v_ph_pkg, v_ph_sku
  FROM product_kit_components WHERE kit_product_id=v_kid;
  v_phnum := (substring(v_ph_slot from 2))::int;

  v_ic := (regexp_match(v_ph_sku, '^'||p_sku||'-([0-9.]+)-(K|E)[0-9]+$'))[1];
  IF v_ic IS NULL THEN
    v_ic := (regexp_match(v_ph_sku, '^'||p_sku||'-([A-Za-z]{2,6})$'))[1];
    v_legacy := (v_ic IS NOT NULL);
  END IF;
  IF v_ic IS NULL THEN RAISE EXCEPTION 'internal_code/cor nao extraivel do sku % - defer manual', v_ph_sku; END IF;

  FOR r IN
    SELECT s.id sid, s.piece_label, s.source_url, s.dim_a_mm, s.dim_l_mm, s.dim_p_mm, fn_norm_piece_label(s.piece_label) pnorm
    FROM kit_component_ficha_staging s
    WHERE s.product_sku=p_sku AND s.piece_label NOT LIKE '\_\_%'
      AND s.match_status IN ('no_component','ambiguous','pending')
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
      WHEN r.pnorm ~ 'porta ?copo' THEN 'TAMPA' WHEN r.pnorm ~ 'marmita' THEN 'POTE'
      ELSE NULL END;
    v_a := CASE WHEN r.dim_a_mm BETWEEN 1 AND 1500 THEN r.dim_a_mm END;
    v_l := CASE WHEN r.dim_l_mm BETWEEN 1 AND 1500 THEN r.dim_l_mm END;
    v_pp := CASE WHEN r.dim_p_mm BETWEEN 1 AND 1500 THEN r.dim_p_mm END;
    v_nm := left(initcap(r.piece_label), 80);

    IF v_kind='item' THEN
      IF (NOT v_ph_pkg) AND (NOT v_first_item) THEN
        slot:=v_ph_slot; acao:='UPDATE placeholder->item'; v_tgt:=v_ph_id; v_first_item:=true; v_kidx:=greatest(v_kidx,v_phnum);
        IF NOT p_dry THEN
          UPDATE product_kit_components SET component_name=v_nm, component_type_code=v_type,
                 component_code=CASE WHEN v_legacy THEN p_sku||'-'||v_ph_slot ELSE component_code END,
                 component_sku =CASE WHEN v_legacy THEN p_sku||'-'||v_ic||'-'||v_ph_slot ELSE component_sku END,
                 height_mm=v_a, width_mm=v_l, length_mm=v_pp, dim_source='ficha', dim_source_url=r.source_url WHERE id=v_ph_id;
          UPDATE kit_component_ficha_staging SET match_status='promoted', matched_component_id=v_ph_id, product_id=v_kid,
                 piece_kind='item', piece_norm=r.pnorm, match_confidence=1.0, promoted_at=now(), notes='decomp:placeholder' WHERE id=r.sid;
        END IF;
      ELSE
        v_kidx:=v_kidx+1; IF (NOT v_ph_pkg) AND v_kidx=v_phnum THEN v_kidx:=v_kidx+1; END IF;
        slot:='K'||v_kidx; acao:='INSERT item'; v_code:=p_sku||'-'||slot; v_csku:=p_sku||'-'||v_ic||'-'||slot;
        IF NOT p_dry THEN
          INSERT INTO product_kit_components(kit_product_id,component_name,component_type_code,slot_code,component_code,component_sku,
            is_packaging,quantity,is_standalone_sellable,height_mm,width_mm,length_mm,dim_source,dim_source_url)
          VALUES (v_kid,v_nm,v_type,slot,v_code,v_csku,false,1,false,v_a,v_l,v_pp,'ficha',r.source_url) RETURNING id INTO v_tgt;
          UPDATE kit_component_ficha_staging SET match_status='promoted', matched_component_id=v_tgt, product_id=v_kid,
                 piece_kind='item', piece_norm=r.pnorm, match_confidence=1.0, promoted_at=now(), notes='decomp:novo' WHERE id=r.sid;
        END IF;
      END IF;
    ELSE
      IF v_ph_pkg AND (NOT v_first_pkg) THEN
        slot:=v_ph_slot; acao:='UPDATE placeholder->pkg'; v_tgt:=v_ph_id; v_first_pkg:=true; v_eidx:=greatest(v_eidx,v_phnum);
        IF NOT p_dry THEN
          UPDATE product_kit_components SET component_name=v_nm, component_type_code=coalesce(v_type,'CAIXA'),
                 component_code=CASE WHEN v_legacy THEN p_sku||'-'||v_ph_slot ELSE component_code END,
                 component_sku =CASE WHEN v_legacy THEN p_sku||'-'||v_ic||'-'||v_ph_slot ELSE component_sku END,
                 pkg_ext_height_mm=v_a, pkg_ext_width_mm=v_l, pkg_ext_length_mm=v_pp, dim_source='ficha', dim_source_url=r.source_url WHERE id=v_ph_id;
          UPDATE kit_component_ficha_staging SET match_status='promoted', matched_component_id=v_ph_id, product_id=v_kid,
                 piece_kind='packaging', piece_norm=r.pnorm, match_confidence=1.0, promoted_at=now(), notes='decomp:placeholder pkg' WHERE id=r.sid;
        END IF;
      ELSE
        v_eidx:=v_eidx+1; IF v_ph_pkg AND v_eidx=v_phnum THEN v_eidx:=v_eidx+1; END IF;
        slot:='E'||v_eidx; acao:='INSERT pkg'; v_code:=p_sku||'-'||slot; v_csku:=p_sku||'-'||v_ic||'-'||slot;
        IF NOT p_dry THEN
          INSERT INTO product_kit_components(kit_product_id,component_name,component_type_code,slot_code,component_code,component_sku,
            is_packaging,quantity,is_standalone_sellable,pkg_ext_height_mm,pkg_ext_width_mm,pkg_ext_length_mm,dim_source,dim_source_url)
          VALUES (v_kid,v_nm,coalesce(v_type,'CAIXA'),slot,v_code,v_csku,true,1,false,v_a,v_l,v_pp,'ficha',r.source_url) RETURNING id INTO v_tgt;
          UPDATE kit_component_ficha_staging SET match_status='promoted', matched_component_id=v_tgt, product_id=v_kid,
                 piece_kind='packaging', piece_norm=r.pnorm, match_confidence=1.0, promoted_at=now(), notes='decomp:novo pkg' WHERE id=r.sid;
        END IF;
      END IF;
    END IF;

    tipo:=v_type; nome:=v_nm; a:=v_a; l:=v_l; p:=v_pp; RETURN NEXT;
  END LOOP;
END $$;;
