
-- ============================================================
-- FUNÇÃO: fn_backfill_asia_properties()
-- Lê descricao + nome do Bronze ASIA → popula product_properties
-- Usa fn_import_product_properties com supplier_code='asia'
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_backfill_asia_properties()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total        integer := 0;
  v_ok           integer := 0;
  v_skip         integer := 0;
  v_err          integer := 0;
  r              record;
  v_raw_text     text;
  v_result       jsonb;
BEGIN
  FOR r IN
    SELECT DISTINCT ON (p.id)
      p.id AS product_id,
      p.supplier_reference,
      p.name AS product_name,
      spr.raw_data->>'descricao' AS descricao,
      spr.raw_data->>'nome'      AS nome_raw
    FROM products p
    JOIN suppliers s ON s.id = p.supplier_id
    JOIN supplier_products_raw spr ON spr.supplier_id = s.id
      AND (
        spr.supplier_sku = p.supplier_reference
        OR spr.supplier_sku LIKE p.supplier_reference || '-%'
        OR spr.supplier_sku LIKE p.supplier_reference || '|%'
      )
    LEFT JOIN product_properties pp ON pp.product_id = p.id
    WHERE s.code = 'ASIA'
      AND p.is_active = true
      AND pp.id IS NULL  -- sem properties ainda
      AND spr.status = 'processed'
    ORDER BY p.id, spr.updated_at DESC NULLS LAST
  LOOP
    v_total := v_total + 1;

    -- Monta texto combinado: nome + descricao para melhor cobertura
    v_raw_text := CONCAT_WS(', ',
      NULLIF(TRIM(r.nome_raw), ''),
      NULLIF(TRIM(r.descricao), ''),
      NULLIF(TRIM(r.product_name), '')
    );

    IF v_raw_text IS NULL OR TRIM(v_raw_text) = '' THEN
      v_skip := v_skip + 1;
      CONTINUE;
    END IF;

    BEGIN
      SELECT public.fn_import_product_properties(
        r.product_id,
        v_raw_text,
        'backfill_asia',
        'asia'
      ) INTO v_result;

      IF (v_result->>'properties_imported')::integer > 0 THEN
        v_ok := v_ok + 1;
      ELSE
        v_skip := v_skip + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_err := v_err + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'total_processados', v_total,
    'com_properties',    v_ok,
    'sem_match',         v_skip,
    'erros',             v_err,
    'cobertura_pct',     ROUND(v_ok::numeric / NULLIF(v_total, 0) * 100, 1)
  );
END;
$$;

COMMENT ON FUNCTION public.fn_backfill_asia_properties() IS
'Backfill de product_properties para produtos ASIA usando descricao+nome do Bronze. v1.0 2026-06-11';
;
