-- ============================================================================
-- Melhoria 2/4 — Blindagem da projeção products -> product_physical
-- fix_version = 2026-06-26_physical_sourcetruth
-- products é a FONTE-DA-VERDADE única dos campos físicos/caixa.
-- product_physical é projeção COALESCE-safe (preserva colunas exclusivas:
-- internal_length_cm/internal_width_cm/internal_height_cm).
-- Reparos:
--  (1) WHERE do upsert agora compara o VALOR FINAL (pós-COALESCE) de TODAS as
--      colunas projetadas -> captura diffs só-de-caixa e evita updates espúrios.
--  (2) Gate do trigger ampliado para todas as colunas físicas/caixa (+ mm).
-- Transform mm->cm e semântica COALESCE preservados byte a byte.
-- ANTI-REGRESSÃO (Lovable bot): NÃO REMOVER os reparos acima.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_sync_product_physical_from_products(p_product_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_weight_g   numeric;
    v_height_cm  numeric;
    v_width_cm   numeric;
    v_length_cm  numeric;
    v_diam_cm    numeric;
    v_cap_ml     numeric;
    v_shape      text;
    v_blen_cm    numeric;
    v_bwid_cm    numeric;
    v_bhei_cm    numeric;
    v_bwkg       numeric;
    v_bvol_cm3   numeric;
    v_bqty       integer;
    v_boxlen_mm  numeric;
    v_boxwid_mm  numeric;
    v_boxhei_mm  numeric;
BEGIN
    SELECT
        NULLIF(weight_g,   0),
        NULLIF(height_cm,  0),
        NULLIF(width_cm,   0),
        NULLIF(length_cm,  0),
        NULLIF(diameter_cm,0),
        NULLIF(capacity_ml,0),
        shape_type,
        NULLIF(box_length_cm, 0),
        NULLIF(box_width_cm,  0),
        NULLIF(box_height_cm, 0),
        NULLIF(box_weight_kg, 0),
        NULLIF(box_volume_cm3,0),
        box_quantity,
        NULLIF(box_length_mm, 0),
        NULLIF(box_width_mm,  0),
        NULLIF(box_height_mm, 0)
    INTO v_weight_g, v_height_cm, v_width_cm, v_length_cm,
         v_diam_cm, v_cap_ml, v_shape,
         v_blen_cm, v_bwid_cm, v_bhei_cm,
         v_bwkg, v_bvol_cm3, v_bqty,
         v_boxlen_mm, v_boxwid_mm, v_boxhei_mm
    FROM products WHERE id = p_product_id;

    IF NOT FOUND THEN RETURN FALSE; END IF;

    -- Nada útil para copiar
    IF v_weight_g IS NULL AND v_height_cm IS NULL AND v_width_cm IS NULL
       AND v_length_cm IS NULL AND v_diam_cm IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Se box_*_mm tiver valor, converter mm→cm (os campos mm no products estão realmente em mm)
    IF v_boxlen_mm IS NOT NULL THEN v_blen_cm := v_boxlen_mm / 10.0; END IF;
    IF v_boxwid_mm IS NOT NULL THEN v_bwid_cm := v_boxwid_mm / 10.0; END IF;
    IF v_boxhei_mm IS NOT NULL THEN v_bhei_cm := v_boxhei_mm / 10.0; END IF;

    INSERT INTO product_physical (
        product_id,
        length_cm, width_cm, height_cm, diameter_cm,
        weight_g, capacity_ml, shape_type,
        box_length_cm, box_width_cm, box_height_cm,
        box_weight_kg, box_volume_cm3, box_quantity,
        created_at, updated_at
    )
    VALUES (
        p_product_id,
        v_length_cm, v_width_cm, v_height_cm, v_diam_cm,
        v_weight_g,  v_cap_ml,   v_shape,
        v_blen_cm,   v_bwid_cm,  v_bhei_cm,
        v_bwkg,      v_bvol_cm3, v_bqty,
        now(),       now()
    )
    ON CONFLICT (product_id) DO UPDATE SET
        weight_g     = COALESCE(EXCLUDED.weight_g,    product_physical.weight_g),
        height_cm    = COALESCE(EXCLUDED.height_cm,   product_physical.height_cm),
        width_cm     = COALESCE(EXCLUDED.width_cm,    product_physical.width_cm),
        length_cm    = COALESCE(EXCLUDED.length_cm,   product_physical.length_cm),
        diameter_cm  = COALESCE(EXCLUDED.diameter_cm, product_physical.diameter_cm),
        capacity_ml  = COALESCE(EXCLUDED.capacity_ml, product_physical.capacity_ml),
        shape_type   = COALESCE(EXCLUDED.shape_type,  product_physical.shape_type),
        box_length_cm  = COALESCE(EXCLUDED.box_length_cm,  product_physical.box_length_cm),
        box_width_cm   = COALESCE(EXCLUDED.box_width_cm,   product_physical.box_width_cm),
        box_height_cm  = COALESCE(EXCLUDED.box_height_cm,  product_physical.box_height_cm),
        box_weight_kg  = COALESCE(EXCLUDED.box_weight_kg,  product_physical.box_weight_kg),
        box_volume_cm3 = COALESCE(EXCLUDED.box_volume_cm3, product_physical.box_volume_cm3),
        box_quantity   = COALESCE(EXCLUDED.box_quantity,   product_physical.box_quantity),
        updated_at     = now()
    WHERE (
        product_physical.weight_g      IS DISTINCT FROM COALESCE(EXCLUDED.weight_g,      product_physical.weight_g)      OR
        product_physical.height_cm     IS DISTINCT FROM COALESCE(EXCLUDED.height_cm,     product_physical.height_cm)     OR
        product_physical.width_cm      IS DISTINCT FROM COALESCE(EXCLUDED.width_cm,      product_physical.width_cm)      OR
        product_physical.length_cm     IS DISTINCT FROM COALESCE(EXCLUDED.length_cm,     product_physical.length_cm)     OR
        product_physical.diameter_cm   IS DISTINCT FROM COALESCE(EXCLUDED.diameter_cm,   product_physical.diameter_cm)   OR
        product_physical.capacity_ml   IS DISTINCT FROM COALESCE(EXCLUDED.capacity_ml,   product_physical.capacity_ml)   OR
        product_physical.shape_type    IS DISTINCT FROM COALESCE(EXCLUDED.shape_type,    product_physical.shape_type)    OR
        product_physical.box_length_cm IS DISTINCT FROM COALESCE(EXCLUDED.box_length_cm, product_physical.box_length_cm) OR
        product_physical.box_width_cm  IS DISTINCT FROM COALESCE(EXCLUDED.box_width_cm,  product_physical.box_width_cm)  OR
        product_physical.box_height_cm IS DISTINCT FROM COALESCE(EXCLUDED.box_height_cm, product_physical.box_height_cm) OR
        product_physical.box_weight_kg IS DISTINCT FROM COALESCE(EXCLUDED.box_weight_kg, product_physical.box_weight_kg) OR
        product_physical.box_volume_cm3 IS DISTINCT FROM COALESCE(EXCLUDED.box_volume_cm3,product_physical.box_volume_cm3) OR
        product_physical.box_quantity  IS DISTINCT FROM COALESCE(EXCLUDED.box_quantity,  product_physical.box_quantity)
    );

    RETURN true;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'fn_sync_product_physical_from_products(%) error: %', p_product_id, SQLERRM;
    RETURN FALSE;
END;
$function$;

-- Gate do trigger ampliado: qualquer mudança física/caixa (incl. mm) propaga ao satélite.
CREATE OR REPLACE FUNCTION public.fn_trg_sync_physical_on_product_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (
    NEW.weight_g       IS DISTINCT FROM OLD.weight_g       OR
    NEW.height_cm      IS DISTINCT FROM OLD.height_cm      OR
    NEW.width_cm       IS DISTINCT FROM OLD.width_cm       OR
    NEW.length_cm      IS DISTINCT FROM OLD.length_cm      OR
    NEW.diameter_cm    IS DISTINCT FROM OLD.diameter_cm    OR
    NEW.capacity_ml    IS DISTINCT FROM OLD.capacity_ml    OR
    NEW.shape_type     IS DISTINCT FROM OLD.shape_type     OR
    NEW.box_length_cm  IS DISTINCT FROM OLD.box_length_cm  OR
    NEW.box_width_cm   IS DISTINCT FROM OLD.box_width_cm   OR
    NEW.box_height_cm  IS DISTINCT FROM OLD.box_height_cm  OR
    NEW.box_quantity   IS DISTINCT FROM OLD.box_quantity   OR
    NEW.box_weight_kg  IS DISTINCT FROM OLD.box_weight_kg  OR
    NEW.box_volume_cm3 IS DISTINCT FROM OLD.box_volume_cm3 OR
    NEW.box_length_mm  IS DISTINCT FROM OLD.box_length_mm  OR
    NEW.box_width_mm   IS DISTINCT FROM OLD.box_width_mm   OR
    NEW.box_height_mm  IS DISTINCT FROM OLD.box_height_mm
  ) THEN
    PERFORM public.fn_sync_product_physical_from_products(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;;
