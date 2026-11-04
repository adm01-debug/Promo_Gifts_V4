CREATE OR REPLACE FUNCTION public.fn_asia_legacy_harvest_batch()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net', 'archive'
AS $function$
DECLARE
  v_done     INT := 0;
  v_fail     INT := 0;
  v_item     RECORD;
  v_resp     RECORD;
  v_body     TEXT;
  v_cf_id    TEXT;
  v_cf_url   TEXT;
  v_org      CONSTANT UUID := '5db5aee1-064b-4ef4-9193-345dcd8274ea';
  v_cdnbase  CONSTANT TEXT := 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw';
BEGIN
  FOR v_item IN
    SELECT q.id, q.product_id, q.request_id, q.cf_custom_id,
           q.source_url, q.supplier_code
    FROM asia_legacy_upload_queue q
    WHERE q.status = 'uploading' AND q.request_id IS NOT NULL
  LOOP
    SELECT * INTO v_resp FROM net._http_response
    WHERE id = v_item.request_id LIMIT 1;

    IF NOT FOUND THEN CONTINUE; END IF;

    v_body := COALESCE(v_resp.content, '');

    -- Verificar se houve erro HTTP
    IF v_resp.status_code NOT IN (200, 201) THEN
      UPDATE asia_legacy_upload_queue
      SET status = 'error',
          error_msg = LEFT('HTTP ' || v_resp.status_code::text || ': ' || v_body, 300),
          updated_at = NOW()
      WHERE id = v_item.id;
      v_fail := v_fail + 1;
      CONTINUE;
    END IF;

    -- Extração do cf_image_id da resposta SSE/JSON
    -- O MCP Worker retorna SSE com "data: {...}" contendo o resultado
    BEGIN
      -- Tentar parsear como JSON direto
      v_cf_id := (v_body::jsonb->'result'->'content'->0->'text')::text;
      IF v_cf_id IS NOT NULL THEN
        -- É texto com o JSON da resposta CF dentro
        v_cf_id := ((v_cf_id::text)::jsonb->>'id');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_cf_id := NULL;
    END;

    -- Fallback: regex para extrair "id":"..."
    IF v_cf_id IS NULL OR TRIM(REPLACE(v_cf_id, '"', '')) = '' THEN
      v_cf_id := (REGEXP_MATCH(v_body, '"id"\s*:\s*"([a-z0-9A-Z\-_]+)"'))[1];
    END IF;

    -- Se a resposta menciona "already exists", usar o custom_id
    IF v_cf_id IS NULL AND v_body ILIKE '%already exists%' THEN
      v_cf_id := v_item.cf_custom_id;
    END IF;

    IF v_cf_id IS NULL OR TRIM(v_cf_id) = '' THEN
      -- Fallback final: usar o cf_custom_id
      -- (CF aceita o custom_id como ID se o upload foi aceito)
      IF v_body ILIKE '%"success":true%' OR v_body ILIKE '%asia-%' THEN
        v_cf_id := v_item.cf_custom_id;
      ELSE
        UPDATE asia_legacy_upload_queue
        SET status = 'error',
            error_msg = LEFT('no_cf_id: ' || v_body, 300),
            updated_at = NOW()
        WHERE id = v_item.id;
        v_fail := v_fail + 1;
        CONTINUE;
      END IF;
    END IF;

    v_cf_id := TRIM(REPLACE(v_cf_id, '"', ''));
    v_cf_url := v_cdnbase || '/' || v_cf_id || '/public';

    -- Inserir product_images (trigger fn_sync_product_images_to_products
    -- atualiza products.primary_image_url automaticamente)
    BEGIN
      INSERT INTO product_images (
        product_id, cloudflare_image_id, url_cdn, url_original,
        image_type, is_primary, is_active, display_order,
        source_supplier, organization_id,
        filename, alt_text
      ) VALUES (
        v_item.product_id,
        v_cf_id,
        v_cf_url,
        v_item.source_url,
        'main', true, true, 1,
        v_item.supplier_code,
        v_org,
        SPLIT_PART(v_item.source_url, '/', -1),
        SPLIT_PART(v_item.source_url, '/', -1)
      )
      ON CONFLICT (cloudflare_image_id) DO NOTHING;

      UPDATE asia_legacy_upload_queue
      SET status = 'done',
          cf_image_id = v_cf_id,
          updated_at = NOW()
      WHERE id = v_item.id;

      v_done := v_done + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE asia_legacy_upload_queue
      SET status = 'error',
          error_msg = LEFT(SQLERRM, 300),
          updated_at = NOW()
      WHERE id = v_item.id;
      v_fail := v_fail + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object('harvested_ok', v_done, 'harvested_fail', v_fail);
END;
$function$
