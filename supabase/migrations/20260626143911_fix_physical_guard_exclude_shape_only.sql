-- M2 (refinamento) — o early-return guard NÃO deve criar satélite para produtos
-- "shape-only" (apenas shape_type, sem nenhuma dimensão primária ou de caixa).
-- O satélite product_physical existe para refletir DIMENSÕES físicas (frete/cálculo);
-- shape isolado não tem valor dimensional. Remove v_shape da cadeia AND do guard
-- (mantém todos os dims de caixa, que SÃO úteis). Evita 102 linhas esparsas.
-- fix_version=2026-06-26_physical_guard_no_shape_only
-- ANTI-REGRESSÃO: guard considera dims primárias + dims de caixa (cm/mm/qty/peso/vol);
-- NÃO incluir shape_type sozinho como gatilho de criação de linha.
DO $f$
DECLARE v_def text; v_new text; v_c int;
BEGIN
  v_def := pg_get_functiondef('public.fn_sync_product_physical_from_products(uuid)'::regprocedure);
  IF v_def NOT LIKE '%AND v_bvol_cm3 IS NULL AND v_shape IS NULL THEN%' THEN
    RETURN; -- já sem v_shape (idempotente)
  END IF;
  v_c := (length(v_def) - length(replace(v_def,'AND v_bvol_cm3 IS NULL AND v_shape IS NULL THEN','')))/length('AND v_bvol_cm3 IS NULL AND v_shape IS NULL THEN');
  IF v_c <> 1 THEN
    RAISE EXCEPTION 'Ancora inesperada (count=%) — abortando', v_c;
  END IF;
  v_new := replace(v_def,
    'AND v_bvol_cm3 IS NULL AND v_shape IS NULL THEN',
    'AND v_bvol_cm3 IS NULL THEN');
  EXECUTE v_new;
END $f$;;
