
-- ============================================================
-- FIX: fn_promote_variants_of_parent
-- Problema: COALESCE(pv.stock_quantity, 0) nos INSERTs
-- converte NULL do Silver em 0, que o ON CONFLICT COALESCE
-- não consegue distinguir de "zero real" → destrói estoque Gold.
--
-- Regra correta:
--   Silver NULL  → passa NULL → ON CONFLICT preserva Gold existente
--   Silver 0     → passa 0   → ON CONFLICT escreve 0 (zero genuíno)
--   Silver 1862  → passa 1862→ ON CONFLICT escreve 1862
-- ============================================================
DO $$
DECLARE
  v_body text;
  v_body_after text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_body
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'fn_promote_variants_of_parent'
    AND pg_get_function_arguments(p.oid) = 'p_supplier_id uuid, p_parent_reference text';

  IF v_body IS NULL THEN
    RAISE EXCEPTION 'fn_promote_variants_of_parent não encontrada';
  END IF;

  -- ── Bug 1 (pos ~1786): INSERT product_variants ──────────────────
  -- "COALESCE(pv.stock_quantity,0), COALESCE(pv.is_active,true)"
  v_body_after := replace(v_body,
    'COALESCE(pv.stock_quantity,0), COALESCE(pv.is_active,true)',
    'pv.stock_quantity, COALESCE(pv.is_active,true)'
  );

  IF v_body_after = v_body THEN
    RAISE EXCEPTION 'Bug 1 (product_variants stock) NÃO encontrado — string não coincide';
  END IF;

  -- ── Bug 2 (pos ~4385): INSERT variant_supplier_sources ──────────
  -- "COALESCE(pv.stock_quantity, 0), COALESCE(pv.stock_quantity, 0),"
  v_body_after := replace(v_body_after,
    'COALESCE(pv.stock_quantity, 0), COALESCE(pv.stock_quantity, 0),',
    'pv.stock_quantity, pv.stock_quantity,'
  );

  IF v_body_after = replace(v_body,
      'COALESCE(pv.stock_quantity,0), COALESCE(pv.is_active,true)',
      'pv.stock_quantity, COALESCE(pv.is_active,true)') THEN
    RAISE EXCEPTION 'Bug 2 (VSS stock) NÃO encontrado — string não coincide';
  END IF;

  -- Substitui CREATE OR REPLACE FUNCTION por só o corpo para re-executar
  EXECUTE v_body_after;

  RAISE NOTICE 'fn_promote_variants_of_parent corrigida: 2 COALESCE(stock,0) removidos';
END;
$$;
;
