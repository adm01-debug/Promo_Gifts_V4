
-- ================================================================
-- fn_ingest_colors_batch: ingere feed Colors do SPOT em supplier_colors
-- Chave natural: (organization_id, supplier_id, name)
-- ================================================================
CREATE OR REPLACE FUNCTION public.fn_ingest_colors_batch(
  p_supplier_code text,
  p_items         jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sid          uuid := public.fn_resolve_supplier(p_supplier_code);
  v_org_id       uuid;
  v_item         jsonb;
  v_color_code   text;
  v_description  text;
  v_hex          text;
  v_fetched      int := 0;
  v_upserted     int := 0;
  v_skipped      int := 0;
  v_errors       int := 0;
  v_errsamples   jsonb := '[]'::jsonb;
BEGIN
  -- Obter organization_id do fornecedor
  SELECT organization_id INTO v_org_id
  FROM public.suppliers
  WHERE id = v_sid
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'organization_id não encontrado para supplier %', p_supplier_code;
  END IF;

  IF jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'p_items deve ser array jsonb';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_fetched := v_fetched + 1;
    BEGIN
      -- Extrair campos do payload SPOT Colors
      v_color_code  := NULLIF(TRIM(COALESCE(v_item->>'ColorCode', v_item->>'color_code', v_item->>'code')), '');
      v_description := NULLIF(TRIM(COALESCE(v_item->>'Description', v_item->>'description', v_item->>'name')), '');
      v_hex         := NULLIF(TRIM(COALESCE(v_item->>'ColorHex', v_item->>'hex', v_item->>'HexCode')), '');

      IF v_color_code IS NULL OR v_description IS NULL THEN
        v_skipped := v_skipped + 1;
        IF jsonb_array_length(v_errsamples) < 10 THEN
          v_errsamples := v_errsamples || jsonb_build_object('motivo','sem_chave','item',v_item);
        END IF;
        CONTINUE;
      END IF;

      INSERT INTO public.supplier_colors (
        id, supplier_id, organization_id,
        api_color_id, code, name, hex_code,
        source, is_active, is_available,
        api_description, api_raw_data,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(), v_sid, v_org_id,
        v_color_code, v_color_code, v_description, v_hex,
        'api_spot', true, true,
        v_description, v_item,
        now(), now()
      )
      ON CONFLICT (organization_id, supplier_id, name)
      DO UPDATE SET
        api_color_id    = EXCLUDED.api_color_id,
        code            = EXCLUDED.code,
        hex_code        = COALESCE(EXCLUDED.hex_code, supplier_colors.hex_code),
        api_description = EXCLUDED.api_description,
        api_raw_data    = EXCLUDED.api_raw_data,
        is_active       = true,
        updated_at      = now();

      v_upserted := v_upserted + 1;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      IF jsonb_array_length(v_errsamples) < 10 THEN
        v_errsamples := v_errsamples || jsonb_build_object(
          'erro', SQLERRM, 'sqlstate', SQLSTATE, 'code', v_color_code
        );
      END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'supplier_code', p_supplier_code,
    'feed', 'colors',
    'fetched',   v_fetched,
    'upserted',  v_upserted,
    'skipped',   v_skipped,
    'errors',    v_errors,
    'error_samples', v_errsamples
  );
END;
$$;

COMMENT ON FUNCTION public.fn_ingest_colors_batch IS
  'Ingere feed Colors do SPOT (ColorCode+Description+hex) em supplier_colors via upsert idempotente';
;
