-- M2 (completude do sync) — DESCOBERTO EM TESTE EXAUSTIVO: duplo-gate divergente.
-- (1) O WHEN do TRIGGER trg_sync_product_physical era mais ESTREITO que o IF do
--     corpo da função: não incluía box_length_cm/width/height/quantity, box_*_mm
--     nem shape_type. Como o WHEN curto-circuita ANTES da função, mudanças
--     SÓ-DE-CAIXA nunca disparavam o sync (apesar do IF interno já estar amplo).
-- (2) O early-return guard da função retornava FALSE se todos os dims PRIMÁRIOS
--     fossem nulos, IGNORANDO dims de caixa => produto "só-caixa" nunca sincronizava.
-- Fix: alinhar o WHEN do trigger ao IF da função E ampliar o guard para considerar
-- dims de caixa + shape_type. Provado em 200 simulações (mismatch 100->0).
-- fix_version=2026-06-26_physical_box_gate_guard
-- ANTI-REGRESSÃO (Lovable bot): o WHEN do trigger e o early-return guard DEVEM
-- incluir TODAS as colunas dimensionais (primárias + caixa cm/mm + shape). NÃO estreitar.

-- (2) Amplia o early-return guard da função (patch dinâmico, âncora única)
DO $f$
DECLARE v_def text; v_new text; v_c int;
BEGIN
  v_def := pg_get_functiondef('public.fn_sync_product_physical_from_products(uuid)'::regprocedure);
  IF v_def LIKE '%v_cap_ml IS NULL AND v_blen_cm IS NULL%' THEN
    RETURN; -- já corrigido (idempotente)
  END IF;
  v_c := (length(v_def) - length(replace(v_def,'AND v_diam_cm IS NULL AND v_cap_ml IS NULL THEN','')))/length('AND v_diam_cm IS NULL AND v_cap_ml IS NULL THEN');
  IF v_c <> 1 THEN
    RAISE EXCEPTION 'Ancora do guard inesperada (count=%) — abortando', v_c;
  END IF;
  v_new := replace(v_def,
    'AND v_diam_cm IS NULL AND v_cap_ml IS NULL THEN',
    'AND v_diam_cm IS NULL AND v_cap_ml IS NULL AND v_blen_cm IS NULL AND v_bwid_cm IS NULL AND v_bhei_cm IS NULL AND v_boxlen_mm IS NULL AND v_boxwid_mm IS NULL AND v_boxhei_mm IS NULL AND v_bqty IS NULL AND v_bwkg IS NULL AND v_bvol_cm3 IS NULL AND v_shape IS NULL THEN');
  EXECUTE v_new;
END $f$;

-- (1) Recria o trigger com WHEN abrangente (alinhado ao IF da função)
CREATE OR REPLACE TRIGGER trg_sync_product_physical AFTER UPDATE ON public.products FOR EACH ROW
WHEN (
  new.weight_g IS DISTINCT FROM old.weight_g OR new.height_cm IS DISTINCT FROM old.height_cm OR
  new.width_cm IS DISTINCT FROM old.width_cm OR new.length_cm IS DISTINCT FROM old.length_cm OR
  new.diameter_cm IS DISTINCT FROM old.diameter_cm OR new.capacity_ml IS DISTINCT FROM old.capacity_ml OR
  new.shape_type IS DISTINCT FROM old.shape_type OR new.box_length_cm IS DISTINCT FROM old.box_length_cm OR
  new.box_width_cm IS DISTINCT FROM old.box_width_cm OR new.box_height_cm IS DISTINCT FROM old.box_height_cm OR
  new.box_quantity IS DISTINCT FROM old.box_quantity OR new.box_weight_kg IS DISTINCT FROM old.box_weight_kg OR
  new.box_volume_cm3 IS DISTINCT FROM old.box_volume_cm3 OR new.box_length_mm IS DISTINCT FROM old.box_length_mm OR
  new.box_width_mm IS DISTINCT FROM old.box_width_mm OR new.box_height_mm IS DISTINCT FROM old.box_height_mm
)
EXECUTE FUNCTION fn_trg_sync_physical_on_product_update();;
