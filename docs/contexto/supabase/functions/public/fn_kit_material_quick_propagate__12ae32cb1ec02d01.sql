CREATE OR REPLACE FUNCTION public.fn_kit_material_quick_propagate()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_gold INTEGER := 0; v_silver INTEGER := 0;
BEGIN
  -- Propagar para Gold
  WITH g AS (
    UPDATE product_kit_components pkc
    SET material_type_id = kct.default_material_type_id,
        secondary_material_type_id = COALESCE(pkc.secondary_material_type_id, kct.secondary_material_type_id),
        updated_at = NOW()
    FROM kit_component_types kct
    WHERE pkc.component_type_code = kct.code
      AND pkc.material_type_id IS NULL
      AND kct.default_material_type_id IS NOT NULL
    RETURNING pkc.id
  ) SELECT COUNT(*) INTO v_gold FROM g;

  -- Propagar para Silver via Gold
  WITH s AS (
    UPDATE kit_component_padronizacao kcp
    SET material_type_id = pkc.material_type_id,
        secondary_material_type_id = COALESCE(kcp.secondary_material_type_id, pkc.secondary_material_type_id),
        updated_at = NOW()
    FROM product_kit_components pkc
    WHERE kcp.kit_component_id = pkc.id
      AND kcp.material_type_id IS NULL
      AND pkc.material_type_id IS NOT NULL
    RETURNING kcp.id
  ) SELECT COUNT(*) INTO v_silver FROM s;

  RETURN jsonb_build_object(
    'gold_updated', v_gold, 'silver_updated', v_silver, 'ts', NOW()
  );
END;
$function$
