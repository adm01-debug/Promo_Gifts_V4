-- Refina o early-return guard de fn_sync_product_physical_from_products:
-- products é fonte da verdade; product_physical é projeção fiel.
-- Regra: NÃO criar linha nova só-com-shape (sem valor de frete), MAS
-- atualizar shape em linha de satélite que JÁ EXISTE (projeção fiel).
-- Corrige 62 produtos XBZ com satélite vazio + shape NULL onde products.shape_type='rectangular'.
-- Patch dinâmico idempotente, preserva SET search_path, resiliente ao bot Lovable.
DO $$
DECLARE v_def text; v_new text;
BEGIN
  v_def := pg_get_functiondef('public.fn_sync_product_physical_from_products(uuid)'::regprocedure);

  -- idempotência
  IF v_def ~ 'v_sat_existe' THEN
    RAISE NOTICE 'fix_version physical_guard_shape_existing_row_v1 já aplicado — pulando';
    RETURN;
  END IF;

  -- validar unicidade das âncoras antes de mexer
  IF (SELECT count(*) FROM regexp_matches(v_def,'v_boxlen_mm  numeric; v_boxwid_mm  numeric; v_boxhei_mm  numeric;','g')) <> 1
     OR (SELECT count(*) FROM regexp_matches(v_def,'IF NOT FOUND THEN RETURN FALSE; END IF;','g')) <> 1
     OR (SELECT count(*) FROM regexp_matches(v_def,'AND v_bqty IS NULL AND v_bwkg IS NULL AND v_bvol_cm3 IS NULL THEN','g')) <> 1 THEN
    RAISE EXCEPTION 'Âncoras de patch inesperadas — abortando (possível reescrita pelo bot)';
  END IF;

  v_new := v_def;
  v_new := replace(v_new,
    'v_boxlen_mm  numeric; v_boxwid_mm  numeric; v_boxhei_mm  numeric;',
    'v_boxlen_mm  numeric; v_boxwid_mm  numeric; v_boxhei_mm  numeric; v_sat_existe boolean;');
  v_new := replace(v_new,
    'IF NOT FOUND THEN RETURN FALSE; END IF;',
    'IF NOT FOUND THEN RETURN FALSE; END IF;' || chr(10) ||
    '    v_sat_existe := EXISTS(SELECT 1 FROM product_physical WHERE product_id = p_product_id); -- fix_version: physical_guard_shape_existing_row_v1');
  v_new := replace(v_new,
    'AND v_bqty IS NULL AND v_bwkg IS NULL AND v_bvol_cm3 IS NULL THEN',
    'AND v_bqty IS NULL AND v_bwkg IS NULL AND v_bvol_cm3 IS NULL AND (v_shape IS NULL OR NOT v_sat_existe) THEN');

  EXECUTE v_new;
  RAISE NOTICE 'fix_version physical_guard_shape_existing_row_v1 aplicado com sucesso';
END $$;;
