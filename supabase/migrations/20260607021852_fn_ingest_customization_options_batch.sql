
-- ================================================================
-- fn_ingest_customization_options_batch
-- Ingere o feed CustomizationOptions do SPOT (HotSpots + possibilidades
-- de impressão por produto) em supplier_customization_options_raw.
-- Chave natural (já existe UNIQUE):
--   (supplier_id, product_reference, service_code, table_code, component, location)
-- COALESCE('') nas colunas-chave porque NULL quebra ON CONFLICT.
-- ================================================================
CREATE OR REPLACE FUNCTION public.fn_ingest_customization_options_batch(
  p_supplier_code text,
  p_run_id        uuid,
  p_items         jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sid        uuid := public.fn_resolve_supplier(p_supplier_code);
  v_item       jsonb;
  v_ref        text;
  v_service    text;
  v_table      text;
  v_component  text;
  v_location   text;
  v_fetched    int := 0;
  v_upserted   int := 0;
  v_skipped    int := 0;
  v_errors     int := 0;
  v_errsamples jsonb := '[]'::jsonb;
BEGIN
  IF jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'p_items deve ser array jsonb';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_fetched := v_fetched + 1;
    BEGIN
      -- ProdReference é a chave obrigatória
      v_ref := NULLIF(TRIM(COALESCE(
                 v_item->>'ProdReference', v_item->>'prodReference',
                 v_item->>'product_reference', v_item->>'Reference')), '');

      IF v_ref IS NULL THEN
        v_skipped := v_skipped + 1;
        IF jsonb_array_length(v_errsamples) < 15 THEN
          v_errsamples := v_errsamples || jsonb_build_object('motivo','sem_prod_reference','item',v_item);
        END IF;
        CONTINUE;
      END IF;

      -- COALESCE('') nas demais colunas-chave (NULL quebra o ON CONFLICT)
      v_service   := COALESCE(NULLIF(TRIM(COALESCE(v_item->>'ServiceCode', v_item->>'serviceCode')), ''), '');
      v_table     := COALESCE(NULLIF(TRIM(COALESCE(v_item->>'TableCode', v_item->>'tableCode')), ''), '');
      v_component := COALESCE(NULLIF(TRIM(COALESCE(v_item->>'Component', v_item->>'component')), ''), '');
      v_location  := COALESCE(NULLIF(TRIM(COALESCE(v_item->>'Location', v_item->>'location')), ''), '');

      INSERT INTO public.supplier_customization_options_raw (
        id, supplier_id,
        product_reference, service_code, table_code, component, location,
        hotspot, handling_cost, table_max_area_cm2, max_stitches,
        raw_data, imported_at
      ) VALUES (
        gen_random_uuid(), v_sid,
        v_ref, v_service, v_table, v_component, v_location,
        NULLIF(TRIM(COALESCE(v_item->>'HotSpot', v_item->>'hotspot')), ''),
        CASE WHEN COALESCE(v_item->>'HandlingCost','') ~ '^-?[0-9]+(\.[0-9]+)?$'
             THEN (v_item->>'HandlingCost')::numeric ELSE NULL END,
        CASE WHEN COALESCE(v_item->>'TableMaxAreaCM2','') ~ '^-?[0-9]+(\.[0-9]+)?$'
             THEN (v_item->>'TableMaxAreaCM2')::numeric ELSE NULL END,
        CASE WHEN COALESCE(v_item->>'MaxStitches','') ~ '^-?[0-9]+$'
             THEN (v_item->>'MaxStitches')::int ELSE NULL END,
        v_item, now()
      )
      ON CONFLICT (supplier_id, product_reference, service_code, table_code, component, location)
      DO UPDATE SET
        hotspot            = EXCLUDED.hotspot,
        handling_cost      = EXCLUDED.handling_cost,
        table_max_area_cm2 = EXCLUDED.table_max_area_cm2,
        max_stitches       = EXCLUDED.max_stitches,
        raw_data           = EXCLUDED.raw_data,
        imported_at        = now();

      v_upserted := v_upserted + 1;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      IF jsonb_array_length(v_errsamples) < 15 THEN
        v_errsamples := v_errsamples || jsonb_build_object(
          'erro', SQLERRM, 'sqlstate', SQLSTATE, 'ref', v_ref);
      END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'supplier_code', p_supplier_code,
    'feed', 'customization_options',
    'run_id', p_run_id,
    'fetched',  v_fetched,
    'upserted', v_upserted,
    'skipped',  v_skipped,
    'errors',   v_errors,
    'error_samples', v_errsamples
  );
END;
$$;

COMMENT ON FUNCTION public.fn_ingest_customization_options_batch IS
  'Ingere feed CustomizationOptions do SPOT (HotSpot + possibilidades de impressão por produto) em supplier_customization_options_raw via upsert idempotente pela chave natural';

REVOKE ALL ON FUNCTION public.fn_ingest_customization_options_batch(text,uuid,jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_ingest_customization_options_batch(text,uuid,jsonb) TO service_role;
;
