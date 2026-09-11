-- Substitui o WHERE NOT EXISTS (... FROM silver_variants ...) — que crashava imediatamente —
-- por um guard simples de status no próprio supplier_products_raw.
-- Redireciona chamadas para fn_sm_to_silver corrigida (que usa pipeline v1).
CREATE OR REPLACE FUNCTION public.fn_sm_batch_to_silver(p_batch_size integer DEFAULT 500)
RETURNS TABLE(processed integer, errors integer)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $fn$
DECLARE
  v_bronze_id   uuid;
  v_processed   int := 0;
  v_errors      int := 0;
  v_supplier_id uuid;
BEGIN
  -- ── 1. Resolver supplier_id do SM de forma segura ─────────────────────────
  SELECT id INTO v_supplier_id
  FROM   public.suppliers
  WHERE  code = 'SOMARCAS'
  LIMIT  1;

  IF v_supplier_id IS NULL THEN
    RAISE WARNING 'fn_sm_batch_to_silver: supplier SOMARCAS não encontrado na tabela suppliers';
    RETURN QUERY SELECT 0, 0;
    RETURN;
  END IF;

  -- ── 2. Iterar sobre bronzes pendentes (guard por status — sem tabelas depreciadas) ──
  FOR v_bronze_id IN
    SELECT spr.id
    FROM   public.supplier_products_raw spr
    WHERE  spr.supplier_id = v_supplier_id
      AND  spr.status NOT IN ('processed', 'standardized')
      AND  COALESCE(spr.attempts, 0) < 5
    ORDER BY spr.imported_at
    LIMIT  p_batch_size
  LOOP
    BEGIN
      PERFORM public.fn_sm_to_silver(v_bronze_id);
      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      RAISE WARNING 'fn_sm_batch_to_silver: erro no bronze % — %', v_bronze_id, SQLERRM;
    END;
  END LOOP;

  RETURN QUERY SELECT v_processed, v_errors;
END;
$fn$;;
