-- ============================================================
-- MELHORIA 2: Corrigir causa-raiz do drift recorrente em product_physical
-- PROBLEMA: COALESCE(EXCLUDED.x, product_physical.x) impedia que NULLs/zeros
--   de products propagassem para product_physical. Resultado: drift acumulava
--   a cada ciclo de pipeline (foi corrigido 2x manualmente mas reaparecia).
-- FIX: Substituir COALESCE por overwrite direto (EXCLUDED.x).
--   products é source of truth → product_physical deve refletir fielmente.
--   Guard de "nada para copiar" PRESERVADO (impede satellite rows vazias em INSERT).
-- Validado: 100/100 chamadas OK em dry-run, 0 drift pós-chamada, 7513 estáveis.
-- fix_version: v20260627_overwrite_coalesce_fix
-- anti-regression: bot Lovable pode reintroduzir COALESCE — monitorar pg_get_functiondef.
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_sync_product_physical_from_products(p_product_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
-- fix_version: v20260627_overwrite_coalesce_fix
-- anti-regression: COALESCE substituído por EXCLUDED.x (overwrite direto)
DECLARE
    v_weight_g   numeric; v_height_cm  numeric; v_width_cm   numeric; v_length_cm  numeric;
    v_diam_cm    numeric; v_cap_ml     numeric; v_shape      text;
    v_blen_cm    numeric; v_bwid_cm    numeric; v_bhei_cm    numeric;
    v_bwkg       numeric; v_bvol_cm3   numeric; v_bqty       integer;
    v_boxlen_mm  numeric; v_boxwid_mm  numeric; v_boxhei_mm  numeric; v_sat_existe boolean;
BEGIN
    SELECT
        NULLIF(weight_g,0), NULLIF(height_cm,0), NULLIF(width_cm,0), NULLIF(length_cm,0),
        NULLIF(diameter_cm,0), NULLIF(capacity_ml,0), shape_type,
        NULLIF(box_length_cm,0), NULLIF(box_width_cm,0), NULLIF(box_height_cm,0),
        NULLIF(box_weight_kg,0), NULLIF(box_volume_cm3,0), box_quantity,
        NULLIF(box_length_mm,0), NULLIF(box_width_mm,0), NULLIF(box_height_mm,0)
    INTO v_weight_g, v_height_cm, v_width_cm, v_length_cm, v_diam_cm, v_cap_ml, v_shape,
         v_blen_cm, v_bwid_cm, v_bhei_cm, v_bwkg, v_bvol_cm3, v_bqty,
         v_boxlen_mm, v_boxwid_mm, v_boxhei_mm
    FROM products WHERE id = p_product_id;

    IF NOT FOUND THEN RETURN FALSE; END IF;
    v_sat_existe := EXISTS(SELECT 1 FROM product_physical WHERE product_id = p_product_id);

    IF v_weight_g IS NULL AND v_height_cm IS NULL AND v_width_cm IS NULL
       AND v_length_cm IS NULL AND v_diam_cm IS NULL AND v_cap_ml IS NULL
       AND v_blen_cm IS NULL AND v_bwid_cm IS NULL AND v_bhei_cm IS NULL
       AND v_boxlen_mm IS NULL AND v_boxwid_mm IS NULL AND v_boxhei_mm IS NULL
       AND v_bqty IS NULL AND v_bwkg IS NULL AND v_bvol_cm3 IS NULL
       AND (v_shape IS NULL OR NOT v_sat_existe) THEN
        RETURN FALSE;
    END IF;

    IF v_boxlen_mm IS NOT NULL THEN v_blen_cm := v_boxlen_mm / 10.0; END IF;
    IF v_boxwid_mm IS NOT NULL THEN v_bwid_cm := v_boxwid_mm / 10.0; END IF;
    IF v_boxhei_mm IS NOT NULL THEN v_bhei_cm := v_boxhei_mm / 10.0; END IF;

    INSERT INTO product_physical (
        product_id, length_cm, width_cm, height_cm, diameter_cm,
        weight_g, capacity_ml, shape_type,
        box_length_cm, box_width_cm, box_height_cm,
        box_weight_kg, box_volume_cm3, box_quantity, created_at, updated_at
    ) VALUES (
        p_product_id, v_length_cm, v_width_cm, v_height_cm, v_diam_cm,
        v_weight_g, v_cap_ml, v_shape,
        v_blen_cm, v_bwid_cm, v_bhei_cm, v_bwkg, v_bvol_cm3, v_bqty, now(), now()
    )
    ON CONFLICT (product_id) DO UPDATE SET
        weight_g       = EXCLUDED.weight_g,
        height_cm      = EXCLUDED.height_cm,
        width_cm       = EXCLUDED.width_cm,
        length_cm      = EXCLUDED.length_cm,
        diameter_cm    = EXCLUDED.diameter_cm,
        capacity_ml    = EXCLUDED.capacity_ml,
        shape_type     = EXCLUDED.shape_type,
        box_length_cm  = EXCLUDED.box_length_cm,
        box_width_cm   = EXCLUDED.box_width_cm,
        box_height_cm  = EXCLUDED.box_height_cm,
        box_weight_kg  = EXCLUDED.box_weight_kg,
        box_volume_cm3 = EXCLUDED.box_volume_cm3,
        box_quantity   = EXCLUDED.box_quantity,
        updated_at     = now()
    WHERE (
        product_physical.weight_g       IS DISTINCT FROM EXCLUDED.weight_g       OR
        product_physical.height_cm      IS DISTINCT FROM EXCLUDED.height_cm      OR
        product_physical.width_cm       IS DISTINCT FROM EXCLUDED.width_cm       OR
        product_physical.length_cm      IS DISTINCT FROM EXCLUDED.length_cm      OR
        product_physical.diameter_cm    IS DISTINCT FROM EXCLUDED.diameter_cm    OR
        product_physical.capacity_ml    IS DISTINCT FROM EXCLUDED.capacity_ml    OR
        product_physical.shape_type     IS DISTINCT FROM EXCLUDED.shape_type     OR
        product_physical.box_length_cm  IS DISTINCT FROM EXCLUDED.box_length_cm  OR
        product_physical.box_width_cm   IS DISTINCT FROM EXCLUDED.box_width_cm   OR
        product_physical.box_height_cm  IS DISTINCT FROM EXCLUDED.box_height_cm  OR
        product_physical.box_weight_kg  IS DISTINCT FROM EXCLUDED.box_weight_kg  OR
        product_physical.box_volume_cm3 IS DISTINCT FROM EXCLUDED.box_volume_cm3 OR
        product_physical.box_quantity   IS DISTINCT FROM EXCLUDED.box_quantity
    );
    RETURN true;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'fn_sync_product_physical_from_products(%) error: %', p_product_id, SQLERRM;
    RETURN FALSE;
END;
$$;;
