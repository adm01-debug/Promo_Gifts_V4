-- Orquestrador SPOT por REF: Bronze -> Silver -> Gold com TODAS as etapas, na ordem correta.
-- Idempotente. re-standardize re-arma status='standardized' (necessário p/ promote).
CREATE OR REPLACE FUNCTION public.fn_spot_process_ref(p_parent_ref text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
DECLARE
  v_sup uuid := 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0';
  v_rep uuid; v_pad uuid; r record; v_vars int := 0;
  v_promo jsonb; v_promv jsonb; v_repl int; v_pos int; v_gold jsonb; v_recon int;
BEGIN
  PERFORM set_config('app.write_source','pipeline', true);
  PERFORM set_config('app.bulk_import_mode','true', true);

  -- 1. representante (raw com mais conteúdo) + padroniza PARENT
  SELECT spr.id INTO v_rep FROM public.supplier_products_raw spr
   WHERE spr.supplier_id=v_sup AND spr.raw_data->>'ProdReference'=p_parent_ref
   ORDER BY length(spr.raw_data::text) DESC NULLS LAST, spr.id LIMIT 1;
  IF v_rep IS NULL THEN RETURN jsonb_build_object('success',false,'error','sem_raw','ref',p_parent_ref); END IF;
  PERFORM public.fn_standardize_raw(v_rep, p_parent_ref);

  -- 2. padroniza VARIANTES
  FOR r IN SELECT id FROM public.supplier_products_raw
            WHERE supplier_id=v_sup AND raw_data->>'ProdReference'=p_parent_ref LOOP
    PERFORM public.fn_standardize_variant(r.id); v_vars := v_vars + 1;
  END LOOP;

  -- 3. enrich Silver (taxonomia/SEO/extras/reparo texto) + 4. materials regex (BUG-1)
  PERFORM public.fn_spot_silver_enrich(v_sup, p_parent_ref);
  PERFORM public.fn_spot_fix_materials(v_sup, p_parent_ref);

  -- 5. promove PARENT (precisa status standardized) + VARIANTES
  SELECT id INTO v_pad FROM public.produtos_padronizacao
   WHERE supplier_id=v_sup AND supplier_reference=p_parent_ref
   ORDER BY standardized_at DESC NULLS LAST LIMIT 1;
  v_promo  := public.fn_promote_padronizacao(v_pad);
  v_promv  := public.fn_promote_variants_of_parent(v_sup, p_parent_ref);

  -- 6. enrich Gold (variante + produto) + reconciliação variante-viva
  v_repl   := public.fn_spot_variant_repl_enrich(v_sup, p_parent_ref);
  v_pos    := public.fn_spot_print_positions(v_sup, p_parent_ref);
  v_gold   := public.fn_spot_gold_enrich(v_sup, p_parent_ref);
  v_recon  := public.fn_spot_reconcile_variant_to_legacy(v_sup, p_parent_ref);

  RETURN jsonb_build_object('success',true,'ref',p_parent_ref,'variantes',v_vars,
    'promote_parent',v_promo->'success','promote_variants',v_promv->'variantes_promovidas',
    'repl',v_repl,'print_positions',v_pos,'gold',v_gold,'reconciliadas',v_recon);
END $$;

-- Batch por LOTE (ordenado, janela offset/limit). NÃO roda sozinho; chamada manual controla o rollout.
CREATE OR REPLACE FUNCTION public.fn_spot_process_batch(p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
DECLARE
  v_sup uuid := 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0';
  v_ref text; v_ok int := 0; v_err int := 0; v_errs jsonb := '[]'::jsonb;
BEGIN
  FOR v_ref IN
    SELECT DISTINCT raw_data->>'ProdReference' rr
    FROM public.supplier_products_raw
    WHERE supplier_id=v_sup AND raw_data->>'ProdReference' IS NOT NULL
    ORDER BY rr OFFSET p_offset LIMIT p_limit
  LOOP
    BEGIN
      PERFORM public.fn_spot_process_ref(v_ref); v_ok := v_ok + 1;
    EXCEPTION WHEN OTHERS THEN
      v_err := v_err + 1; v_errs := v_errs || jsonb_build_object('ref',v_ref,'erro',SQLERRM);
    END;
  END LOOP;
  RETURN jsonb_build_object('processados',v_ok,'erros',v_err,'detalhe_erros',v_errs,'offset',p_offset,'limit',p_limit);
END $$;;
