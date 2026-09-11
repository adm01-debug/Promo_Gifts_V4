
-- ============================================================
-- MIGRATION: SPOT Canonical Code Guard (pipeline-proof)
-- Problema: fn_match_supplier_color cai no fallback por nome
--   quando supplier_colors.code='103' é revertido pelo pipeline
--   (spot_ws_colors reescreve code='03' para name='Preto').
-- Fix: após fn_match_supplier_color, se v_code (da API) é 3
--   dígitos mas v_fcode retornado é <3 dígitos (legacy fallback),
--   preservar o código canônico de 3 dígitos da API.
-- ============================================================
DO $$
DECLARE
  v_src text;
  v_anchor_old text;
  v_anchor_new text;
BEGIN
  SELECT pg_get_functiondef(oid)
  INTO v_src
  FROM pg_proc
  WHERE proname = 'fn_standardize_variant'
    AND pronamespace = 'public'::regnamespace;

  IF v_src IS NULL THEN
    RAISE EXCEPTION 'fn_standardize_variant não encontrada';
  END IF;

  -- Verificar se o guard já foi aplicado (idempotência)
  IF v_src LIKE '%SPOT CANONICAL CODE GUARD%' THEN
    RAISE NOTICE 'Guard já aplicado — migration idempotente, nada a fazer.';
    RETURN;
  END IF;

  -- Âncora: linha após fn_match_supplier_color, antes de v_canonical_id
  -- O texto exato vem de pg_get_functiondef com newlines reais
  v_anchor_old :=
    'v_fhex:=COALESCE(v_col.color_hex,v_chex);' || E'\n' ||
    '  v_canonical_id:=public.fn_match_canonical_color';

  v_anchor_new :=
    'v_fhex:=COALESCE(v_col.color_hex,v_chex);' || E'\n' ||
    E'  -- \u2705 SPOT CANONICAL CODE GUARD (pipeline-proof 2026-06-09):\n' ||
    E'  -- Preserva c\u00f3digo 3-d\u00edgitos da API (ex: ''103'') quando fn_match_supplier_color\n' ||
    E'  -- retorna c\u00f3digo legado 2-d\u00edgitos via fallback de nome (ex: ''03'').\n' ||
    E'  -- N\u00e3o afeta: v_code=''03''(2d\u21922d ok), ''104''(3d\u21923d ok), ''143''(3d\u21923d ok).\n' ||
    E'  IF r.supplier_id = v_SPOT AND v_code IS NOT NULL\n' ||
    E'     AND length(v_code) = 3 AND COALESCE(length(v_fcode), 0) < 3 THEN\n' ||
    E'    v_fcode := v_code; -- ex: ''103'' sobrep\u00f5e ''03'' retornado por fallback de nome\n' ||
    E'  END IF;\n' ||
    '  v_canonical_id:=public.fn_match_canonical_color';

  IF v_src NOT LIKE '%' || 'v_fhex:=COALESCE(v_col.color_hex,v_chex);' || '%' THEN
    RAISE EXCEPTION 'Âncora "v_fhex:=COALESCE..." não encontrada na função — estrutura mudou';
  END IF;

  -- Aplicar patch via replace
  v_src := replace(v_src, v_anchor_old, v_anchor_new);

  -- Executar a função patcheada
  EXECUTE v_src;

  RAISE NOTICE 'Guard aplicado com sucesso em fn_standardize_variant';
END;
$$;
;
