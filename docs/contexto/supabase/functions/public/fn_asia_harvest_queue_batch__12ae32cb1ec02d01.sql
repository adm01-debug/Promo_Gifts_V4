CREATE OR REPLACE FUNCTION public.fn_asia_harvest_queue_batch()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net'
AS $function$
DECLARE
  v_succeeded  integer := 0;
  v_dup        integer := 0;
  v_failed     integer := 0;
  v_rec        RECORD;
  v_inner_json jsonb;
  v_outcome    text;
  v_cf_url     text;
  c_org CONSTANT uuid := '5db5aee1-064b-4ef4-9193-345dcd8274ea';
  c_tid_main    CONSTANT uuid := '7ea182ff-edcc-4c4c-b7a1-443b07500f6c';
BEGIN
  FOR v_rec IN
    SELECT
      m.request_id,
      m.queue_id,
      m.cf_custom_id,
      q.product_id,
      q.image_type,
      q.display_order,
      q.url_original,
      r.status_code,
      (r.content::jsonb)->'result'->'content'->0->>'text' AS inner_text
    FROM asia_upload_mapping m
    JOIN net._http_response r         ON r.id  = m.request_id
    JOIN asia_image_import_queue q    ON q.id  = m.queue_id
    WHERE m.status = 'pending'
      AND r.status_code IS NOT NULL
  LOOP
    v_inner_json := NULL;
    BEGIN
      IF v_rec.inner_text LIKE '{%}' THEN
        v_inner_json := v_rec.inner_text::jsonb;
      END IF;
    EXCEPTION WHEN OTHERS THEN v_inner_json := NULL; END;

    v_outcome := CASE
      WHEN v_inner_json IS NOT NULL AND v_inner_json->>'id' IS NOT NULL THEN 'uploaded'
      WHEN v_rec.inner_text LIKE '%already exists%' OR v_rec.inner_text LIKE '%5414%' THEN 'duplicate'
      WHEN v_rec.status_code != 200 OR v_rec.inner_text ILIKE '%error%' OR v_rec.inner_text IS NULL THEN 'error'
      ELSE 'unknown'
    END;

    v_cf_url := 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/' || v_rec.cf_custom_id || '/public';

    IF v_outcome IN ('uploaded', 'duplicate') THEN
      -- Inserir em product_images
      INSERT INTO product_images (
        product_id, cloudflare_image_id, url_cdn, url_original, filename,
        image_type, image_type_id, is_primary, display_order,
        source_supplier, supplier_code, is_active, organization_id
      )
      VALUES (
        v_rec.product_id, v_rec.cf_custom_id, v_cf_url, v_rec.url_original,
        v_rec.cf_custom_id || '.jpg',
        v_rec.image_type,
        CASE v_rec.image_type WHEN 'main' THEN c_tid_main
                              ELSE '1590e144-e3f8-41e6-98f9-f4a25bae496d'::uuid END,
        v_rec.image_type = 'main',
        v_rec.display_order,
        'ASIA', 'ASIA', true, c_org
      )
      ON CONFLICT (cloudflare_image_id) DO UPDATE SET
        url_cdn    = EXCLUDED.url_cdn,
        updated_at = NOW();

      -- Atualizar primary_image_url (inclui URLs externas)
      IF v_rec.image_type = 'main' THEN
        UPDATE products
        SET primary_image_url = v_cf_url, updated_at = NOW()
        WHERE id = v_rec.product_id
          AND (primary_image_url IS NULL OR primary_image_url NOT LIKE '%imagedelivery%');
      END IF;

      -- Fechar fila
      UPDATE asia_image_import_queue
      SET status = 'done', cloudflare_image_id = v_rec.cf_custom_id,
          cf_url_cdn = v_cf_url, updated_at = NOW()
      WHERE id = v_rec.queue_id;

      IF v_outcome = 'duplicate' THEN v_dup := v_dup + 1;
      ELSE v_succeeded := v_succeeded + 1; END IF;

    ELSE
      UPDATE asia_image_import_queue
      SET status = 'error', last_error = LEFT(COALESCE(v_rec.inner_text,'no_response'), 200),
          updated_at = NOW()
      WHERE id = v_rec.queue_id;
      v_failed := v_failed + 1;
    END IF;

    UPDATE asia_upload_mapping
    SET status = v_outcome, harvested_at = NOW()
    WHERE request_id = v_rec.request_id;

  END LOOP;

  RETURN jsonb_build_object(
    'succeeded', v_succeeded, 'duplicates', v_dup, 'failed', v_failed,
    'still_pending_mapping', (SELECT COUNT(*) FROM asia_upload_mapping WHERE status='pending')
  );
END;
$function$
