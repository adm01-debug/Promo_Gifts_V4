
-- ============================================================
-- fn_backfill_is_thermal() — função permanente de manutenção
-- Pode ser chamada a qualquer momento para re-sincronizar o flag
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_backfill_is_thermal()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_via_props integer := 0;
  v_via_name  integer := 0;
  v_cleared   integer := 0;
BEGIN
  PERFORM set_config('app.bulk_import_mode', 'true', true);
  PERFORM set_config('app.write_source', 'pipeline', true);

  -- PASSO 1: true via product_properties
  UPDATE products p SET is_thermal = true
  WHERE p.is_active = true
    AND (p.is_thermal IS NULL OR p.is_thermal = false)
    AND EXISTS (
      SELECT 1 FROM product_properties pp
      WHERE pp.product_id = p.id
        AND pp.property_code IN (
          'DOUBLE_WALL','THERMAL_COLD_HOT_HOURS','THERMAL_COLD_24_HOT_12',
          'THERMAL_COLD_24_HOT_6','THERMAL_COLD','THERMAL_HOT','THERMAL_PROTECTION'
        )
    );
  GET DIAGNOSTICS v_via_props = ROW_COUNT;

  -- PASSO 2: true via nome/descrição
  UPDATE products p SET is_thermal = true
  WHERE p.is_active = true
    AND (p.is_thermal IS NULL OR p.is_thermal = false)
    AND (
      p.name ~* '\y(t[eé]rmic|garrafa\s+t[eé]rm|bolsa\s+t[eé]rm|lancheira|caneca\s+t[eé]rm|copo\s+t[eé]rm|squeeze\s+t[eé]rm|cooler|isotérm|isot[eé]rm)\y'
      OR p.name ~* 'parede\s+dupla'
      OR (p.name ~* 'inox' AND p.name ~* '(garrafa|copo|caneca|squeeze|bolsa|cuia)')
      OR p.description ~* '(parede\s+dupla|isolad[ao]\s+a\s+v[aá]cuo|mant[eé]m\s+(fria|quente|temperatura)|horas\s+(fria|quente)|frias\s+e\s+quentes)'
    );
  GET DIAGNOSTICS v_via_name = ROW_COUNT;

  -- PASSO 3: false para produtos que não têm evidência de thermal (seguro = só NULLs)
  UPDATE products p SET is_thermal = false
  WHERE p.is_active = true
    AND p.is_thermal IS NULL;
  GET DIAGNOSTICS v_cleared = ROW_COUNT;

  RETURN jsonb_build_object(
    'marcados_via_properties', v_via_props,
    'marcados_via_nome',       v_via_name,
    'default_false',           v_cleared,
    'total_ativados',          v_via_props + v_via_name
  );
END;
$$;

COMMENT ON FUNCTION public.fn_backfill_is_thermal() IS
'Sincroniza is_thermal em products via product_properties + nome/descrição. Safe para bulk. v1.0 2026-06-11';

-- Executar para limpar os NULLs restantes
SELECT public.fn_backfill_is_thermal();
;
