CREATE OR REPLACE FUNCTION public.upsert_supplier_customization_raw(p_supplier_id uuid, p_table_code_option text, p_raw_data jsonb, p_table_code text DEFAULT NULL::text, p_customization_type text DEFAULT NULL::text, p_import_batch_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v_id uuid; v_hash text;
BEGIN
  v_hash := encode(digest(p_raw_data::text,'sha256'),'hex');
  INSERT INTO supplier_customization_raw
    (supplier_id, table_code, table_code_option, customization_type, raw_data, import_batch_id)
  VALUES (p_supplier_id,
          COALESCE(p_table_code, regexp_replace(p_table_code_option, '-[^-]+$', '')),
          p_table_code_option, p_customization_type, p_raw_data, p_import_batch_id)
  ON CONFLICT (supplier_id, table_code_option) DO UPDATE SET
     raw_data           = EXCLUDED.raw_data,
     customization_type = COALESCE(EXCLUDED.customization_type, supplier_customization_raw.customization_type),
     import_batch_id    = COALESCE(EXCLUDED.import_batch_id, supplier_customization_raw.import_batch_id),
     status             = CASE WHEN supplier_customization_raw.content_hash IS DISTINCT FROM v_hash
                               THEN 'pending'::supplier_raw_status ELSE supplier_customization_raw.status END,
     updated_at         = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END $function$
