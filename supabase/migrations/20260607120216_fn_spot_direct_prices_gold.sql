
-- ============================================================
-- fn_spot_direct_prices_gold
-- Hot-path: atualiza faixas de preço direto no Gold
-- (variant_supplier_sources) sem passar pelo Medallion.
-- Chamada pelo workflow SPOT - Sync Preços a cada 1 hora.
-- Reconciliação completa pelo Sync Full de madrugada.
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_spot_direct_prices_gold(
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sid     CONSTANT uuid := 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0'; -- STRICKER
  v_item    jsonb;
  v_sku     text;
  v_vid     uuid;
  v_rows    int;
  v_updated int := 0;
  v_skipped int := 0;
  v_errors  int := 0;
  v_errs    jsonb := '[]'::jsonb;

  -- Preços das faixas
  v_p1 numeric; v_p2 numeric; v_p3 numeric; v_p4 numeric; v_p5 numeric;
  v_q1 int;     v_q2 int;     v_q3 int;     v_q4 int;     v_q5 int;
  v_your_price numeric;
BEGIN
  IF jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'fn_spot_direct_prices_gold: p_items deve ser array jsonb';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    BEGIN
      -- ── Extrair Sku ──────────────────────────────────────────
      v_sku := NULLIF(TRIM(COALESCE(
                 v_item->>'Sku', v_item->>'WebSku',
                 v_item->>'sku', v_item->>'webSku')), '');

      IF v_sku IS NULL THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;

      -- ── Resolver variant via VSS ─────────────────────────────
      SELECT vss.variant_id INTO v_vid
      FROM public.variant_supplier_sources vss
      WHERE vss.supplier_sku = v_sku
        AND vss.supplier_id  = v_sid
      LIMIT 1;

      IF v_vid IS NULL THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;

      -- ── Extrair faixas de preço (null-safe) ──────────────────
      v_p1 := NULLIF(v_item->>'Price1', '')::numeric;
      v_p2 := NULLIF(v_item->>'Price2', '')::numeric;
      v_p3 := NULLIF(v_item->>'Price3', '')::numeric;
      v_p4 := NULLIF(v_item->>'Price4', '')::numeric;
      v_p5 := NULLIF(v_item->>'Price5', '')::numeric;

      v_q1 := NULLIF(v_item->>'MinQt1', '')::int;
      v_q2 := NULLIF(v_item->>'MinQt2', '')::int;
      v_q3 := NULLIF(v_item->>'MinQt3', '')::int;
      v_q4 := NULLIF(v_item->>'MinQt4', '')::int;
      v_q5 := NULLIF(v_item->>'MinQt5', '')::int;

      v_your_price := NULLIF(v_item->>'YourPrice', '')::numeric;

      -- Validação mínima: ao menos Price1 deve existir e ser positivo
      IF v_p1 IS NULL THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;

      -- ── Atualizar variant_supplier_sources ───────────────────
      -- COALESCE preserva valor existente quando o campo vier NULL no feed
      UPDATE public.variant_supplier_sources
      SET
        cost_price       = v_p1,
        cost_price_1     = COALESCE(v_p1,  cost_price_1),
        min_qty_1        = COALESCE(v_q1,  min_qty_1),
        cost_price_2     = COALESCE(v_p2,  cost_price_2),
        min_qty_2        = COALESCE(v_q2,  min_qty_2),
        cost_price_3     = COALESCE(v_p3,  cost_price_3),
        min_qty_3        = COALESCE(v_q3,  min_qty_3),
        cost_price_4     = COALESCE(v_p4,  cost_price_4),
        min_qty_4        = COALESCE(v_q4,  min_qty_4),
        cost_price_5     = COALESCE(v_p5,  cost_price_5),
        min_qty_5        = COALESCE(v_q5,  min_qty_5),
        your_price       = COALESCE(v_your_price, your_price),
        source           = 'hot_path_prices',
        price_updated_at = now(),
        last_synced_at   = now(),
        updated_at       = now()
      WHERE variant_id = v_vid
        AND supplier_id = v_sid;

      GET DIAGNOSTICS v_rows = ROW_COUNT;

      IF v_rows > 0 THEN
        v_updated := v_updated + 1;
      ELSE
        v_skipped := v_skipped + 1; -- VSS existe mas sem linha para STRICKER
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      IF jsonb_array_length(v_errs) < 15 THEN
        v_errs := v_errs || jsonb_build_object(
          'sku', v_sku, 'err', SQLERRM, 'state', SQLSTATE
        );
      END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'feed',          'hot_path_prices',
    'supplier',      'STRICKER',
    'updated',       v_updated,
    'skipped',       v_skipped,
    'errors',        v_errors,
    'error_samples', v_errs,
    'updated_at',    now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_spot_direct_prices_gold(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_spot_direct_prices_gold(jsonb) TO service_role;
COMMENT ON FUNCTION public.fn_spot_direct_prices_gold(jsonb) IS
  'Hot-path SPOT: atualiza faixas de preço direto em variant_supplier_sources. Sem Medallion. Reconciliado pelo Sync Full de madrugada.';
;
