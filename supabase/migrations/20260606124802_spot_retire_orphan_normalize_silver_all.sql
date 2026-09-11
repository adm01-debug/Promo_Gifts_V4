CREATE OR REPLACE FUNCTION public.fn_normalize_silver_all()
RETURNS jsonb LANGUAGE plpgsql SET search_path TO 'public','extensions' AS $$
BEGIN
  -- DEPRECATED 2026-06: operava nas tabelas LEGADAS silver_products/silver_variants,
  -- desconectadas do pipeline canônico (produtos_padronizacao). Não fazia mais efeito útil.
  -- A normalização agora é DISTRIBUÍDA no pipeline canônico:
  --   • NCM + nome  -> fn_standardize_raw (fn_normalize_ncm / fn_clean_spot_name)
  --   • cor         -> fn_standardize_variant (fn_match_supplier_color / fn_match_canonical_color)
  --   • taxonomia/categoria/flags/SEO/extras -> fn_spot_silver_enrich + fn_spot_gold_enrich
  --   • materials   -> fn_spot_fix_materials (regex [.,]\s+)
  -- Orquestração de ponta a ponta: fn_spot_process_ref(ref) / fn_spot_process_batch(limit, offset).
  RETURN jsonb_build_object(
    'deprecated', true,
    'note', 'Aposentada. Use fn_spot_process_ref / fn_spot_process_batch (pipeline canonico).',
    'ran_at', now());
END $$;;
