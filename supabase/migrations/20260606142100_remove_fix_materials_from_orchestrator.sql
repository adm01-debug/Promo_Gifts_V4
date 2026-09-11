
CREATE OR REPLACE FUNCTION public.fn_spot_process_ref(p_parent_ref text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_sup uuid := 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0';
  v_rep uuid; v_pad uuid; r record; v_vars int := 0;
  v_promo jsonb; v_promv jsonb; v_repl int; v_pos int; v_gold jsonb; v_recon int;
BEGIN
  PERFORM set_config('app.write_source','pipeline', true);
  PERFORM set_config('app.bulk_import_mode','true', true);

  -- 1. representante (raw com mais conteúdo) + padroniza PARENT via DE>PARA
  SELECT spr.id INTO v_rep FROM public.supplier_products_raw spr
   WHERE spr.supplier_id=v_sup AND spr.raw_data->>'ProdReference'=p_parent_ref
   ORDER BY length(spr.raw_data::text) DESC NULLS LAST, spr.id LIMIT 1;
  IF v_rep IS NULL THEN RETURN jsonb_build_object('success',false,'error','sem_raw','ref',p_parent_ref); END IF;
  PERFORM public.fn_standardize_raw(v_rep, p_parent_ref);
  -- NOTA: fn_standardize_raw (v2) usa fn_spot_split_list via DE>PARA para Materials.
  --       fn_spot_fix_materials removida desta etapa em 2026-06-06 (não mais necessária).

  -- 2. padroniza VARIANTES
  FOR r IN SELECT id FROM public.supplier_products_raw
            WHERE supplier_id=v_sup AND raw_data->>'ProdReference'=p_parent_ref LOOP
    PERFORM public.fn_standardize_variant(r.id); v_vars := v_vars + 1;
  END LOOP;

  -- 3. enrich Silver (taxonomia/SEO/extras/reparo encoding)
  --    Materials já correto pelo DE>PARA — fn_spot_fix_materials não é mais chamada.
  PERFORM public.fn_spot_silver_enrich(v_sup, p_parent_ref);

  -- 4. promove PARENT + VARIANTES (Silver → Gold)
  SELECT id INTO v_pad FROM public.produtos_padronizacao
   WHERE supplier_id=v_sup AND supplier_reference=p_parent_ref
   ORDER BY standardized_at DESC NULLS LAST LIMIT 1;
  v_promo  := public.fn_promote_padronizacao(v_pad);
  v_promv  := public.fn_promote_variants_of_parent(v_sup, p_parent_ref);

  -- 5. enrich Gold (variante + produto) + posições de impressão + reconciliação
  v_repl   := public.fn_spot_variant_repl_enrich(v_sup, p_parent_ref);
  v_pos    := public.fn_spot_print_positions(v_sup, p_parent_ref);
  v_gold   := public.fn_spot_gold_enrich(v_sup, p_parent_ref);
  v_recon  := public.fn_spot_reconcile_variant_to_legacy(v_sup, p_parent_ref);

  RETURN jsonb_build_object('success',true,'ref',p_parent_ref,'variantes',v_vars,
    'promote_parent',v_promo->'success','promote_variants',v_promv->'variantes_promovidas',
    'repl',v_repl,'print_positions',v_pos,'gold',v_gold,'reconciliadas',v_recon);
END $function$;
;
