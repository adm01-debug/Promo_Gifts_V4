-- Troca digest(sha256)/pgcrypto por md5() built-in no hash de change-detection.
-- site_hash so e comparado consigo mesmo (mesmo loader) -> md5 e suficiente.
CREATE OR REPLACE FUNCTION public.fn_upsert_asia_wp_batch(p_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_ASIA       uuid := 'd2734e23-d633-4819-bb15-e51aa44e2118';
  v_item       jsonb;
  v_parent_ref text;
  v_canon      jsonb;
  v_hash       text;
  v_rows       int;
  v_fetched    int := 0;
  v_updated    int := 0;
  v_parents    int := 0;
BEGIN
  IF jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'fn_upsert_asia_wp_batch: p_items deve ser array jsonb';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_fetched := v_fetched + 1;
    v_parent_ref := NULLIF(TRIM(v_item->>'sku'), '');
    CONTINUE WHEN v_parent_ref IS NULL;

    v_canon := public.fn_asia_wp_to_canonical(v_item);
    v_hash  := md5(v_canon::text);

    UPDATE public.supplier_products_raw r SET
      site_data       = v_canon,
      site_hash       = v_hash,
      site_source_url = v_canon->>'url',
      site_status     = CASE WHEN r.site_hash IS DISTINCT FROM v_hash
                             THEN 'processed'::supplier_raw_status
                             ELSE r.site_status END,
      site_scraped_at = now(),
      updated_at      = now()
    WHERE r.supplier_id = v_ASIA
      AND r.raw_data->>'referencia' = v_parent_ref;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_updated := v_updated + v_rows;
    IF v_rows > 0 THEN v_parents := v_parents + 1; END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'fetched',         v_fetched,
    'matched_parents', v_parents,
    'updated_rows',    v_updated,
    'rodado_em',       now()
  );
END;
$fn$;;
