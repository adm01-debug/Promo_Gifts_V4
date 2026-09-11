CREATE OR REPLACE FUNCTION public.fn_promote_kit_ficha_staging(p_only_sku text DEFAULT NULL)
RETURNS TABLE(promoted int, no_component int, ambiguous int, skipped int, pending int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
DECLARE r record; v_pid uuid; v_norm text; v_kind text; v_comp uuid; v_cnt int; v_conf numeric; v_src_url text; v_tie int;
BEGIN
  FOR r IN SELECT * FROM kit_component_ficha_staging
           WHERE match_status='pending' AND (p_only_sku IS NULL OR product_sku=p_only_sku)
           ORDER BY product_sku, id
  LOOP
    v_norm := fn_norm_piece_label(r.piece_label);
    SELECT id INTO v_pid FROM products WHERE sku=r.product_sku AND is_kit=true;
    IF v_pid IS NULL THEN
      UPDATE kit_component_ficha_staging SET match_status='no_component', notes='kit nao encontrado/is_kit=false', piece_norm=v_norm WHERE id=r.id; CONTINUE;
    END IF;

    v_kind := r.piece_kind;
    IF v_kind IS NULL THEN
      IF v_norm ~ '(maleta|estojo|pouch|bolsa|sacola|necessaire|\mcase\M)' THEN v_kind:='packaging';
      ELSIF v_norm ~ 'embalagem' OR fn_norm_piece_label(coalesce(r.raw_text,'')) ~ '(papel|papelao)' THEN v_kind:='outer_box';
      ELSE v_kind:='item'; END IF;
    END IF;

    IF v_kind='outer_box' THEN
      UPDATE kit_component_ficha_staging SET match_status='skipped', piece_kind='outer_box', product_id=v_pid, piece_norm=v_norm,
             notes='caixa de transporte, nao e componente' WHERE id=r.id; CONTINUE;
    END IF;

    v_comp:=NULL; v_conf:=NULL; v_tie:=0;
    IF v_kind='packaging' THEN
      SELECT count(*) INTO v_cnt FROM product_kit_components WHERE kit_product_id=v_pid AND is_packaging;
      IF v_cnt=1 THEN SELECT id INTO v_comp FROM product_kit_components WHERE kit_product_id=v_pid AND is_packaging; v_conf:=0.95;
      ELSIF v_cnt>1 THEN
        SELECT id, extensions.similarity(fn_norm_piece_label(component_name), v_norm) INTO v_comp, v_conf
        FROM product_kit_components WHERE kit_product_id=v_pid AND is_packaging
        ORDER BY extensions.similarity(fn_norm_piece_label(component_name), v_norm) DESC NULLS LAST LIMIT 1;
      END IF;
    ELSE
      WITH cand AS (
        SELECT c.id,
          CASE WHEN fn_norm_piece_label(c.component_name)=v_norm THEN 1.00
               WHEN length(fn_norm_piece_label(c.component_name))>=4 AND v_norm LIKE '%'||fn_norm_piece_label(c.component_name)||'%' THEN 0.92
               WHEN length(v_norm)>=4 AND fn_norm_piece_label(c.component_name) LIKE '%'||v_norm||'%' THEN 0.90
               ELSE extensions.similarity(fn_norm_piece_label(c.component_name), v_norm) END AS score
        FROM product_kit_components c WHERE c.kit_product_id=v_pid AND NOT c.is_packaging
      ), ranked AS (SELECT id, score, row_number() OVER (ORDER BY score DESC) rn FROM cand)
      SELECT id, score, (SELECT count(*) FROM ranked r2 WHERE r2.score >= ranked.score - 0.08 AND r2.id<>ranked.id)
        INTO v_comp, v_conf, v_tie FROM ranked WHERE rn=1;
      IF v_conf IS NULL OR v_conf < 0.50 OR v_tie > 0 THEN v_comp:=NULL; END IF;
    END IF;

    IF v_comp IS NULL THEN
      UPDATE kit_component_ficha_staging
        SET match_status = CASE WHEN v_tie>0 THEN 'ambiguous' ELSE 'no_component' END,
            piece_kind=v_kind, product_id=v_pid, piece_norm=v_norm,
            notes = CASE WHEN v_tie>0 THEN 'rotulo casa com multiplos componentes' ELSE 'nenhum componente '||v_kind||' casou' END
        WHERE id=r.id; CONTINUE;
    END IF;

    v_src_url := coalesce(r.source_url, (SELECT spr.site_data->>'ficha_tecnica_pdf' FROM supplier_products_raw spr WHERE spr.product_id=v_pid AND spr.site_data ? 'ficha_tecnica_pdf' LIMIT 1));

    IF v_kind='packaging' THEN
      UPDATE product_kit_components SET pkg_ext_height_mm=r.dim_a_mm, pkg_ext_width_mm=r.dim_l_mm, pkg_ext_length_mm=r.dim_p_mm,
             dim_source='ficha', dim_source_url=v_src_url
       WHERE id=v_comp AND coalesce(dim_source,'heuristic') IN ('heuristic','supplier_api');
    ELSE
      UPDATE product_kit_components SET height_mm=r.dim_a_mm, width_mm=r.dim_l_mm, length_mm=r.dim_p_mm,
             weight_g=CASE WHEN weight_g IS NULL AND r.weight_g IS NOT NULL THEN r.weight_g ELSE weight_g END,
             dim_source='ficha', dim_source_url=v_src_url
       WHERE id=v_comp AND coalesce(dim_source,'heuristic') IN ('heuristic','supplier_api');
    END IF;

    UPDATE kit_component_ficha_staging SET match_status='promoted', matched_component_id=v_comp, piece_kind=v_kind,
           product_id=v_pid, piece_norm=v_norm, match_confidence=round(coalesce(v_conf,0)::numeric,3), promoted_at=now(), notes=NULL
     WHERE id=r.id;
  END LOOP;

  RETURN QUERY SELECT count(*) FILTER (WHERE match_status='promoted')::int, count(*) FILTER (WHERE match_status='no_component')::int,
                      count(*) FILTER (WHERE match_status='ambiguous')::int, count(*) FILTER (WHERE match_status='skipped')::int,
                      count(*) FILTER (WHERE match_status='pending')::int
               FROM kit_component_ficha_staging WHERE (p_only_sku IS NULL OR product_sku=p_only_sku);
END $$;;
