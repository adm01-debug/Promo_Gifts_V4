CREATE OR REPLACE FUNCTION prod_audit.score_product_category(p_product_id uuid, p_category_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'prod_audit', 'public', 'extensions'
AS $function$
DECLARE
  v_pf record; v_ck record;
  v_matched int := 0; v_cat_total int; v_score numeric := 0;
  v_tok text;
BEGIN
  SELECT * INTO v_pf FROM prod_audit.product_features WHERE product_id = p_product_id;
  SELECT * INTO v_ck FROM prod_audit.category_keywords WHERE category_id = p_category_id;
  IF v_pf IS NULL OR v_ck IS NULL THEN RETURN 0; END IF;

  v_cat_total := COALESCE(array_length(v_ck.tokens, 1), 0);
  
  -- Match: iterar tokens da categoria e verificar se cada um aparece no produto
  FOREACH v_tok IN ARRAY v_ck.tokens LOOP
    IF v_tok = ANY(v_pf.tokens) 
       OR v_pf.name_normalized ILIKE '%' || v_tok || '%' THEN
      v_matched := v_matched + 1;
    END IF;
  END LOOP;

  IF v_ck.is_client_segment THEN RETURN 0; END IF;
  IF v_matched = 0 AND NOT v_ck.is_kit_segment THEN RETURN 0; END IF;

  v_score := (v_matched::numeric / GREATEST(v_cat_total, 1)) * 40;

  IF v_matched > 0 AND v_ck.is_material_segment AND EXISTS (
    SELECT 1 FROM unnest(v_pf.materials) AS pm
    WHERE v_ck.name_normalized ILIKE '%' || pm || '%' OR pm = ANY(v_ck.tokens)
  ) THEN v_score := v_score + 25; END IF;

  IF v_matched > 0 AND v_ck.is_eco_segment THEN
    IF v_pf.has_eco_keyword THEN v_score := v_score + 20;
    ELSIF EXISTS (
      SELECT 1 FROM unnest(v_pf.materials) AS pm
      WHERE pm ~* 'bambu|cortica|cortiça|reciclad|rpet|organico|orgânico'
    ) THEN v_score := v_score + 15; END IF;
  END IF;

  IF v_ck.is_kit_segment AND v_pf.has_kit_keyword THEN
    v_score := v_score + CASE WHEN v_matched > 0 THEN 20 ELSE 10 END;
  END IF;

  v_score := v_score + GREATEST(0, extensions.similarity(v_pf.name_normalized, v_ck.name_normalized) * 10);

  RETURN v_score;
END;
$function$
